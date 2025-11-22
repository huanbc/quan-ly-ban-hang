
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Product, Supplier, LineItem } from '../types';
import { formatCurrency, generateId } from '../utils';

interface OCRPurchaseModalProps {
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddProduct: (product: Omit<Product, 'id'>, callback?: (newProduct: Product) => void) => void;
  onUpdateProduct: (product: Product) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>, callback?: (newSupplier: Supplier) => void) => void;
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
}

interface ExtractedItem {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    vat: number;
}

interface InvoiceData {
    date: string;
    invoiceNumber: string;
    description: string;
    supplierName: string;
    supplierPhone: string;
    supplierAddress: string;
    items: ExtractedItem[];
}

interface InvoiceItem {
    id: string;
    file: File;
    previewUrl: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    data: InvoiceData;
    error?: string;
}

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

const OCRPurchaseModal: React.FC<OCRPurchaseModalProps> = ({ 
    onClose, 
    onAddTransaction, 
    onAddProduct, 
    onUpdateProduct, 
    onAddSupplier, 
    products, 
    suppliers,
    transactions 
}) => {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find(i => i.id === selectedId);

  // Helper to calculate current stock for a product
  const calculateCurrentStock = (productId: string): number => {
      const product = products.find(p => p.id === productId);
      if (!product) return 0;
      
      let stock = product.initialStock || 0;
      transactions.forEach(t => {
          if (t.lineItems) {
              t.lineItems.forEach(item => {
                  if (item.productId === productId) {
                      if (t.category === 'Bán hàng' || t.category === 'Trả hàng cho nhà cung cấp') {
                          stock -= item.quantity;
                      } else if (t.category === 'Nhập hàng' || t.category === 'Khách trả hàng') {
                          stock += item.quantity;
                      }
                  }
              });
          }
      });
      return stock;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);
      
      const newItems: InvoiceItem[] = newFiles.map(file => ({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        data: {
            date: new Date().toISOString().split('T')[0],
            invoiceNumber: '',
            description: 'Nhập hàng từ hóa đơn',
            supplierName: '',
            supplierPhone: '',
            supplierAddress: '',
            items: []
        }
      }));

      setItems(prev => [...prev, ...newItems]);
      
      if (!selectedId && newItems.length > 0) {
          setSelectedId(newItems[0].id);
      }

      newItems.forEach(item => processItem(item));
      
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
                    text: "Extract invoice data: date (YYYY-MM-DD), invoiceNumber, supplierName, supplierPhone, supplierAddress, items (list of {sku, name, quantity, unitPrice, vat}). If SKU is missing, leave empty. Return JSON."
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
                    supplierName: { type: Type.STRING },
                    supplierPhone: { type: Type.STRING },
                    supplierAddress: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                sku: { type: Type.STRING },
                                name: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                unitPrice: { type: Type.NUMBER },
                                vat: { type: Type.NUMBER }
                            }
                        }
                    }
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
                    supplierName: data.supplierName || '',
                    supplierPhone: data.supplierPhone || '',
                    supplierAddress: data.supplierAddress || '',
                    items: data.items || [],
                    description: data.invoiceNumber ? `Nhập hàng HĐ ${data.invoiceNumber}` : 'Nhập hàng'
                }
            } : i));
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
  
  const handleItemChange = (itemIndex: number, field: keyof ExtractedItem, value: any) => {
      if (!selectedItem) return;
      const newItems = [...selectedItem.data.items];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      updateItemData(selectedItem.id, 'items', newItems);
  }
  
  const deleteItemRow = (itemIndex: number) => {
      if (!selectedItem) return;
      const newItems = selectedItem.data.items.filter((_, idx) => idx !== itemIndex);
      updateItemData(selectedItem.id, 'items', newItems);
  }

  const addItemRow = () => {
      if (!selectedItem) return;
      const newItems = [...selectedItem.data.items, { sku: '', name: '', quantity: 1, unitPrice: 0, vat: 0 }];
      updateItemData(selectedItem.id, 'items', newItems);
  }

  const handleSaveItem = async (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      const { date, supplierName, supplierPhone, supplierAddress, items: lineItems, description } = item.data;

      if (!supplierName || lineItems.length === 0) {
          alert("Cần có tên nhà cung cấp và ít nhất một sản phẩm.");
          return;
      }

      // 1. Handle Supplier
      let supplierId = suppliers.find(s => 
          s.name.toLowerCase() === supplierName.toLowerCase() || 
          (s.phone && s.phone === supplierPhone)
      )?.id;

      if (!supplierId) {
          // Create new supplier
          await new Promise<void>((resolve) => {
              onAddSupplier({
                  name: supplierName,
                  phone: supplierPhone,
                  address: supplierAddress,
                  classification: 'Nhà cung cấp'
              }, (newSup) => {
                  supplierId = newSup.id;
                  resolve();
              });
          });
      }

      // 2. Handle Products & Calculate Weighted Average Cost
      const transactionLineItems: LineItem[] = [];
      
      for (const importedItem of lineItems) {
          // Try to find existing product
          let product = products.find(p => 
              (importedItem.sku && p.sku === importedItem.sku) || 
              p.name.toLowerCase() === importedItem.name.toLowerCase()
          );

          let productId = product?.id;

          if (product) {
              // PRODUCT EXISTS: Update Average Cost
              const currentStock = calculateCurrentStock(product.id);
              
              // Only calculate average if we have positive stock, otherwise assume new price is current price
              let newCostPrice = importedItem.unitPrice;
              
              if (currentStock > 0) {
                  const currentTotalValue = currentStock * product.purchasePrice;
                  const newImportValue = importedItem.quantity * importedItem.unitPrice;
                  newCostPrice = (currentTotalValue + newImportValue) / (currentStock + importedItem.quantity);
              }
              
              // Update the product with new weighted average cost
              onUpdateProduct({
                  ...product,
                  purchasePrice: newCostPrice,
                  // Also update VAT if provided
                  vat: importedItem.vat || product.vat
              });

          } else {
              // NEW PRODUCT: Create it
              await new Promise<void>((resolve) => {
                  onAddProduct({
                      sku: importedItem.sku,
                      name: importedItem.name,
                      price: importedItem.unitPrice * 1.2, // Default markup 20%
                      purchasePrice: importedItem.unitPrice,
                      unit: 'Cái', // Default unit
                      initialStock: 0,
                      vat: importedItem.vat
                  }, (newProd) => {
                      productId = newProd.id;
                      resolve();
                  });
              });
          }

          if (productId) {
              transactionLineItems.push({
                  productId: productId,
                  quantity: importedItem.quantity,
                  price: importedItem.unitPrice
              });
          }
      }

      // 3. Create Transaction
      const totalAmount = transactionLineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      onAddTransaction({
          date,
          amount: totalAmount,
          description: description,
          category: 'Nhập hàng',
          type: TransactionType.EXPENSE,
          paymentMethod: 'cash',
          supplierId: supplierId,
          lineItems: transactionLineItems
      });

      // Remove from list
      removeItem(id, { stopPropagation: () => {} } as any);
  };

  const calculateTotal = () => {
      if (!selectedItem) return 0;
      return selectedItem.data.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
            <div>
                <h3 className="text-xl font-bold text-gray-800">Quét hóa đơn nhập hàng (OCR)</h3>
                <p className="text-sm text-gray-500">Tự động nhận diện NCC, sản phẩm và tính giá vốn bình quân</p>
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
                                    {item.status === 'success' && <><CheckIcon /><span className="text-xs text-green-600 font-medium">{item.data.items.length} SP</span></>}
                                    {item.status === 'error' && <><ExclamationIcon /><span className="text-xs text-red-500">Lỗi</span></>}
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
                </div>
            </div>

            {/* Right Content: Editor */}
            <div className="w-2/3 flex flex-col h-full bg-white">
                {selectedItem ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Preview */}
                                <div className="bg-gray-100 rounded-lg border flex items-center justify-center overflow-hidden relative min-h-[200px] lg:h-[300px]">
                                    {selectedItem.file.type === 'application/pdf' ? (
                                        <iframe src={selectedItem.previewUrl} title="PDF Preview" className="w-full h-full absolute inset-0"></iframe>
                                    ) : (
                                        <img src={selectedItem.previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                    )}
                                </div>

                                {/* Header Form */}
                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-700 border-b pb-2">Thông tin chung</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700">Ngày chứng từ</label>
                                            <input type="date" value={selectedItem.data.date} onChange={e => updateItemData(selectedItem.id, 'date', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700">Số hóa đơn</label>
                                            <input type="text" value={selectedItem.data.invoiceNumber} onChange={e => updateItemData(selectedItem.id, 'invoiceNumber', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">Nhà cung cấp</label>
                                        <input type="text" value={selectedItem.data.supplierName} onChange={e => updateItemData(selectedItem.id, 'supplierName', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" placeholder="Tên NCC" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" value={selectedItem.data.supplierPhone} onChange={e => updateItemData(selectedItem.id, 'supplierPhone', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" placeholder="SĐT NCC" />
                                        <input type="text" value={selectedItem.data.supplierAddress} onChange={e => updateItemData(selectedItem.id, 'supplierAddress', e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm" placeholder="Địa chỉ NCC" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">Diễn giải</label>
                                        <input type="text" value={selectedItem.data.description} onChange={e => updateItemData(selectedItem.id, 'description', e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-gray-700">Chi tiết hàng hóa</h4>
                                    <button onClick={addItemRow} className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded hover:bg-primary-100">+ Thêm dòng</button>
                                </div>
                                <table className="min-w-full divide-y divide-gray-200 border text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500">Tên hàng</th>
                                            <th className="px-3 py-2 text-left font-medium text-gray-500 w-24">SKU</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">SL</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">Đơn giá</th>
                                            <th className="px-3 py-2 text-right font-medium text-gray-500 w-16">VAT%</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedItem.data.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-2 py-1">
                                                    <input type="text" value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} className="w-full border-none focus:ring-0 text-sm p-1" placeholder="Tên SP" />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input type="text" value={item.sku || ''} onChange={e => handleItemChange(idx, 'sku', e.target.value)} className="w-full border-none focus:ring-0 text-sm p-1" placeholder="SKU" />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value))} className="w-full border-none focus:ring-0 text-sm p-1 text-right" />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input type="number" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))} className="w-full border-none focus:ring-0 text-sm p-1 text-right" />
                                                </td>
                                                <td className="px-2 py-1">
                                                    <input type="number" value={item.vat} onChange={e => handleItemChange(idx, 'vat', parseFloat(e.target.value))} className="w-full border-none focus:ring-0 text-sm p-1 text-right" />
                                                </td>
                                                <td className="px-2 py-1 text-center">
                                                    <button onClick={() => deleteItemRow(idx)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 font-bold">
                                            <td colSpan={3} className="px-3 py-2 text-right">Tổng cộng:</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(calculateTotal())}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                            <span className="text-sm text-gray-500 italic">
                                {items.length > 0 ? `Hóa đơn ${items.findIndex(i => i.id === selectedId) + 1} / ${items.length}` : ''}
                            </span>
                            <button 
                                onClick={() => handleSaveItem(selectedItem.id)} 
                                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <CheckIcon /> Nhập hàng & Tính giá vốn
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <p className="text-lg">Chọn hóa đơn để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OCRPurchaseModal;
