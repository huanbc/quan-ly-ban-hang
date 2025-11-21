
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, TaxCategory, Product } from '../types';

interface OCRTransactionModalProps {
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddProduct: (product: Omit<Product, 'id'>, callback?: (newProduct: Product) => void) => void;
  products: Product[];
}

const OCRTransactionModal: React.FC<OCRTransactionModalProps> = ({ onClose, onAddTransaction, onAddProduct, products }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form Data
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState(''); // Not strictly in Transaction type but useful for description
  const [selectedTaxCategory, setSelectedTaxCategory] = useState<TaxCategory | ''>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        setError('Vui lòng chọn file ảnh hoặc PDF.');
        return;
      }

      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError('');
    }
  };

  const processFile = async () => {
    if (!file) {
      setError('Vui lòng chọn tài liệu hóa đơn.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;
        // Remove data url prefix (e.g. "data:image/jpeg;base64," or "data:application/pdf;base64,")
        const base64Data = base64String.split(',')[1];

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
             {
                inlineData: {
                    mimeType: file.type,
                    data: base64Data
                }
             },
             {
                text: "Extract the following fields from the invoice document (image or PDF): date (YYYY-MM-DD format), invoiceNumber, description (summary of goods/services), totalAmount (number). Return JSON."
             }
          ],
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
        
        // Correct usage: response.text is a property, NOT a function.
        const text = response.text;
        if (text) {
            try {
                const data = JSON.parse(text);
                if (data.date) setDate(data.date);
                if (data.description) setDescription(data.description);
                if (data.totalAmount) setAmount(String(data.totalAmount));
                if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
            } catch (e) {
                console.error("Failed to parse JSON response:", e);
                setError("Không thể đọc dữ liệu từ hóa đơn. Vui lòng thử lại.");
            }
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setError("Lỗi khi đọc file.");
        setIsProcessing(false);
      }

    } catch (err) {
      console.error(err);
      setError("Có lỗi xảy ra khi xử lý tài liệu. Vui lòng thử lại.");
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !date || !description || !selectedTaxCategory) {
        setError('Vui lòng điền đầy đủ thông tin và chọn nhóm ngành nghề.');
        return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Số tiền không hợp lệ.');
        return;
    }

    // Logic to map Tax Category to a Product/LineItem
    // We try to find a generic product for this category "Doanh thu - [Category Name]"
    // If not found, we create it.
    const genericProductName = `Doanh thu - ${selectedTaxCategory}`;
    let targetProduct = products.find(p => p.name === genericProductName && p.taxCategory === selectedTaxCategory);

    const finalDescription = invoiceNumber ? `${description} (HĐ: ${invoiceNumber})` : description;

    const saveTransaction = (product: Product) => {
        onAddTransaction({
            date,
            amount: parsedAmount,
            description: finalDescription,
            category: 'Bán hàng',
            type: TransactionType.INCOME,
            paymentMethod: 'cash', // Default to cash for simplicity, or add field
            lineItems: [{
                productId: product.id,
                quantity: 1,
                price: parsedAmount
            }]
        });
        onClose();
    };

    if (targetProduct) {
        saveTransaction(targetProduct);
    } else {
        // Create generic product
        onAddProduct({
            name: genericProductName,
            price: 0, // Dynamic price based on transaction
            purchasePrice: 0,
            unit: 'Lần',
            initialStock: 0,
            taxCategory: selectedTaxCategory,
            subCategory: 'Doanh thu tự động'
        }, (newProduct) => {
            saveTransaction(newProduct);
        });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">Nhập liệu doanh thu từ hóa đơn (OCR)</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Upload & Preview */}
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors relative flex flex-col items-center justify-center min-h-[200px]">
                        <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {previewUrl ? (
                            file?.type === 'application/pdf' ? (
                                <iframe 
                                    src={previewUrl} 
                                    title="PDF Preview"
                                    className="w-full h-64 rounded-md border border-gray-200"
                                ></iframe>
                            ) : (
                                <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto object-contain rounded-md" />
                            )
                        ) : (
                            <div className="text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.414l5.414 5.414a1 1 0 01.414 1.414V19a2 2 0 01-2 2z" />
                                </svg>
                                <p>Nhấn hoặc kéo thả ảnh/PDF hóa đơn</p>
                                <p className="text-xs text-gray-400 mt-1">Hỗ trợ: .JPG, .PNG, .PDF</p>
                            </div>
                        )}
                    </div>
                    
                    <button
                        type="button"
                        onClick={processFile}
                        disabled={!file || isProcessing}
                        className="w-full py-2 bg-primary-100 text-primary-700 font-semibold rounded-lg hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-primary-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang xử lý...
                            </>
                        ) : (
                            'Trích xuất thông tin'
                        )}
                    </button>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>

                {/* Right Column: Form Data */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ngày hóa đơn</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Số hóa đơn (nếu có)</label>
                        <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Tổng tiền</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Diễn giải</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required></textarea>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <label className="block text-sm font-bold text-primary-700 mb-2">Chọn nhóm ngành nghề (Bắt buộc)</label>
                        <p className="text-xs text-gray-500 mb-2">Chọn đúng nhóm để hệ thống ghi vào cột tương ứng trong sổ doanh thu.</p>
                        <select 
                            value={selectedTaxCategory} 
                            onChange={e => setSelectedTaxCategory(e.target.value as TaxCategory)} 
                            className="block w-full border-primary-300 ring-1 ring-primary-200 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-primary-50"
                            required
                        >
                            <option value="" disabled>-- Chọn nhóm ngành nghề --</option>
                            {Object.values(TaxCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </form>
            </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
            <button onClick={handleSubmit} type="button" className="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700">Lưu vào sổ</button>
        </div>
      </div>
    </div>
  );
};

export default OCRTransactionModal;
