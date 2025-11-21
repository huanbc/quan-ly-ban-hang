
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, TaxCategory, Product } from '../types';
import { formatCurrency } from '../utils';

interface OCRTransactionModalProps {
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddProduct: (product: Omit<Product, 'id'>, callback?: (newProduct: Product) => void) => void;
  products: Product[];
}

interface InvoiceData {
    date: string;
    invoiceNumber: string;
    description: string;
    amount: string;
    taxCategory: TaxCategory | '';
}

interface InvoiceItem {
    id: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    data: InvoiceData;
    error?: string;
}

// Inline Icons for specific modal use
const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);

const ExclamationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const OCRTransactionModal: React.FC<OCRTransactionModalProps> = ({ onClose, onAddTransaction, onAddProduct, products }) => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived state for the currently selected item
  const selectedItem = items.find(i => i.id === selectedId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);
      
      const newItems: InvoiceItem[] = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        data: {
            date: new Date().toISOString().split('T')[0],
            invoiceNumber: '',
            description: '',
            amount: '',
            taxCategory: ''
        }
      }));

      setItems(prev => [...prev, ...newItems]);
      
      // Select the first new item if nothing is selected
      if (!selectedId && newItems.length > 0) {
          setSelectedId(newItems[0].id);
      }

      // Trigger processing for new items
      newItems.forEach(item => processItem(item));
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processItem = async (item: InvoiceItem) => {
    updateItemStatus(item.id, 'processing');
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(item.file);
      reader.onload = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: item.file.type,
                        data: base64Data
                    }
                },
                {
                    text: "Extract fields: date (YYYY-MM-DD), invoiceNumber, description (summary), totalAmount (number). Return JSON."
                }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    invoiceNumber: { type: Type.STRING },
                    description: { type: Type.STRING },
                    totalAmount: { type: Type.NUMBER }
                }
            }
          }
        });
        
        const text = response.text;
        if (text) {
            const data = JSON.parse(text);
            setItems(prev => prev.map(i => i.id === item.id ? {
                ...i,
                status: 'success',
                data: {
                    ...i.data,
                    date: data.date || i.data.date,
                    invoiceNumber: data.invoiceNumber || '',
                    description: data.description || '',
                    amount: data.totalAmount ? String(data.totalAmount) : '',
                }
            } : i));
        } else {
            throw new Error("No response text");
        }
      };
      reader.onerror = () => {
        updateItemStatus(item.id, 'error', "Lỗi đọc file");
      }
    } catch (err) {
        console.error(err);
        updateItemStatus(item.id, 'error', "Lỗi xử lý AI");
    }
  };

  const updateItemStatus = (id: string, status: InvoiceItem['status'], error?: string) => {
      setItems(prev => prev.map(i => i.id === id ? { ...i, status, error } : i));
  };

  const updateItemData = (id: string, field: keyof InvoiceData, value: any) => {
      setItems(prev => prev.map(i => i.id === id ? {
          ...i,
          data: { ...i.data, [field]: value }
      } : i));
  };

  const removeItem = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setItems(prev => {
          const newItems = prev.filter(i => i.id !== id);
          if (selectedId === id) {
              setSelectedId(newItems.length > 0 ? newItems[0].id : null);
          }
          return newItems;
      });
  };

  const handleSaveItem = (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const { amount, date, description, invoiceNumber, taxCategory } = item.data;
      if (!amount || !date || !description || !taxCategory) {
          alert("Vui lòng điền đầy đủ thông tin và chọn nhóm ngành nghề cho hóa đơn này.");
          return;
      }

      const parsedAmount = parseFloat(amount);
      const finalDescription = invoiceNumber ? `${description} (HĐ: ${invoiceNumber})` : description;
      const genericProductName = `Doanh thu - ${taxCategory}`;
      
      const saveTransaction = (product: Product) => {
        onAddTransaction({
            date,
            amount: parsedAmount,
            description: finalDescription,
            category: 'Bán hàng',
            type: TransactionType.INCOME,
            paymentMethod: 'cash',
            lineItems: [{
                productId: product.id,
                quantity: 1,
                price: parsedAmount
            }]
        });
        // Remove processed item
        setItems(prev => {
            const newItems = prev.filter(i => i.id !== id);
            if (selectedId === id) {
                setSelectedId(newItems.length > 0 ? newItems[0].id : null);
            }
            return newItems;
        });
      };

      let targetProduct = products.find(p => p.name === genericProductName && p.taxCategory === taxCategory);
      if (targetProduct) {
        saveTransaction(targetProduct);
      } else {
        onAddProduct({
            name: genericProductName,
            price: 0,
            purchasePrice: 0,
            unit: 'Lần',
            initialStock: 0,
            taxCategory: taxCategory as TaxCategory,
            subCategory: 'Doanh thu tự động'
        }, (newProduct) => {
            saveTransaction(newProduct);
        });
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
            <div>
                <h3 className="text-xl font-bold text-gray-800">Nhập liệu hàng loạt (OCR)</h3>
                <p className="text-sm text-gray-500">Quét và trích xuất thông tin từ nhiều hóa đơn cùng lúc</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-hidden flex">
            {/* Left Sidebar: List */}
            <div className="w-1/3 border-r bg-gray-50 flex flex-col">
                <div className="p-4 border-b">
                    <input 
                        type="file" 
                        multiple
                        accept="image/*,application/pdf" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Thêm hóa đơn
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => setSelectedId(item.id)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${selectedId === item.id ? 'bg-white border-primary-500 shadow-md' : 'bg-white border-gray-200 hover:border-primary-300'}`}
                        >
                            <div className="h-12 w-12 flex-shrink-0 bg-gray-200 rounded overflow-hidden flex items-center justify-center">
                                {item.file.type === 'application/pdf' ? (
                                    <span className="text-xs font-bold text-gray-500">PDF</span>
                                ) : (
                                    <img src={item.previewUrl} alt="thumb" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${selectedId === item.id ? 'text-primary-700' : 'text-gray-700'}`}>
                                    {item.file.name}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                    {item.status === 'processing' && <><Spinner /><span className="text-xs text-gray-500">Đang xử lý...</span></>}
                                    {item.status === 'success' && <><CheckIcon /><span className="text-xs text-green-600 font-medium">{formatCurrency(Number(item.data.amount) || 0)}</span></>}
                                    {item.status === 'error' && <><ExclamationIcon /><span className="text-xs text-red-500">Lỗi</span></>}
                                    {item.status === 'pending' && <span className="text-xs text-gray-400">Chờ xử lý</span>}
                                </div>
                            </div>
                            <button 
                                onClick={(e) => removeItem(item.id, e)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-10 text-gray-400 px-4">
                            <p>Chưa có hóa đơn nào.</p>
                            <p className="text-xs mt-1">Nhấn "Thêm hóa đơn" để bắt đầu.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content: Editor */}
            <div className="w-2/3 flex flex-col h-full bg-white">
                {selectedItem ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                {/* Preview */}
                                <div className="bg-gray-100 rounded-lg border flex items-center justify-center overflow-hidden relative min-h-[300px] lg:h-auto">
                                    {selectedItem.file.type === 'application/pdf' ? (
                                        <iframe 
                                            src={selectedItem.previewUrl} 
                                            title="PDF Preview"
                                            className="w-full h-full absolute inset-0"
                                        ></iframe>
                                    ) : (
                                        <img src={selectedItem.previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    )}
                                </div>

                                {/* Form */}
                                <div className="space-y-4 flex flex-col">
                                    <h4 className="font-bold text-gray-700 border-b pb-2">Thông tin hóa đơn</h4>
                                    {selectedItem.status === 'error' && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                                            Không thể trích xuất thông tin. Vui lòng nhập thủ công.
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase">Ngày chứng từ</label>
                                        <input 
                                            type="date" 
                                            value={selectedItem.data.date} 
                                            onChange={e => updateItemData(selectedItem.id, 'date', e.target.value)} 
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase">Số hóa đơn</label>
                                        <input 
                                            type="text" 
                                            value={selectedItem.data.invoiceNumber} 
                                            onChange={e => updateItemData(selectedItem.id, 'invoiceNumber', e.target.value)} 
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 uppercase">Tổng tiền (VND)</label>
                                        <input 
                                            type="number" 
                                            value={selectedItem.data.amount} 
                                            onChange={e => updateItemData(selectedItem.id, 'amount', e.target.value)} 
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-bold text-gray-800" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-700 uppercase">Diễn giải</label>
                                        <textarea 
                                            rows={4}
                                            value={selectedItem.data.description} 
                                            onChange={e => updateItemData(selectedItem.id, 'description', e.target.value)} 
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                                        />
                                    </div>
                                    
                                    <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                                        <label className="block text-xs font-bold text-primary-700 uppercase mb-1">Nhóm ngành nghề (Bắt buộc)</label>
                                        <select 
                                            value={selectedItem.data.taxCategory} 
                                            onChange={e => updateItemData(selectedItem.id, 'taxCategory', e.target.value as TaxCategory)} 
                                            className="block w-full border-primary-300 ring-1 ring-primary-200 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                        >
                                            <option value="">-- Chọn nhóm --</option>
                                            {Object.values(TaxCategory).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                            <span className="text-sm text-gray-500 italic">
                                {items.length > 0 ? `Đang xem ${items.findIndex(i => i.id === selectedId) + 1} / ${items.length}` : ''}
                            </span>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleSaveItem(selectedItem.id)} 
                                    className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition-transform active:scale-95 flex items-center gap-2"
                                >
                                    <CheckIcon /> Lưu vào sổ
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.414l5.414 5.414a1 1 0 01.414 1.414V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg">Chọn một hóa đơn bên trái để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OCRTransactionModal;
