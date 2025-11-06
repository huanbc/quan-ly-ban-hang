import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Customer, Supplier, Product, LineItem } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, TrashIcon } from '../constants';
import { formatCurrency } from '../utils';

interface AddTransactionModalProps {
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onAddTransaction, customers, suppliers, products }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [error, setError] = useState('');

  // State for purchase line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [currentQuantity, setCurrentQuantity] = useState('1');
  const [currentPrice, setCurrentPrice] = useState('');

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(''); // Reset category when type changes
    setCustomerId('');
    setSupplierId('');
    setLineItems([]);
  };

  const handleAddLineItem = () => {
    const product = productMap.get(selectedProductId);
    const quantity = parseFloat(currentQuantity);
    const price = parseFloat(currentPrice);

    if (!product || isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
      setError("Vui lòng nhập thông tin sản phẩm hợp lệ.");
      return;
    }

    setLineItems(prev => {
        const existing = prev.find(item => item.productId === selectedProductId);
        if (existing) {
            return prev.map(item => item.productId === selectedProductId ? { ...item, quantity: item.quantity + quantity, price } : item);
        }
        return [...prev, { productId: selectedProductId, quantity, price }];
    });
    
    // Reset inputs
    setSelectedProductId('');
    setCurrentQuantity('1');
    setCurrentPrice('');
    setError('');
  };

  const handleRemoveLineItem = (productId: string) => {
    setLineItems(prev => prev.filter(item => item.productId !== productId));
  };
  
  const totalPurchaseAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [lineItems]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isStockTransaction = ['Nhập hàng', 'Khách trả hàng', 'Trả hàng cho nhà cung cấp'].includes(category);
    let finalAmount = parseFloat(amount);

    if (isStockTransaction) {
        if(lineItems.length === 0) {
            setError('Vui lòng thêm ít nhất một sản phẩm vào phiếu.');
            return;
        }
        finalAmount = totalPurchaseAmount;
    } else {
        if (!amount || !description || !category || !date) {
            setError('Vui lòng điền đầy đủ các thông tin.');
            return;
        }
        if (isNaN(finalAmount) || finalAmount <= 0) {
            setError('Số tiền không hợp lệ.');
            return;
        }
    }


    const transactionData: Omit<Transaction, 'id'> = {
      amount: finalAmount,
      description,
      category,
      date,
      type,
      paymentMethod,
      ...(isStockTransaction && { lineItems }),
    };
    
    if (customerId) transactionData.customerId = customerId;
    if (supplierId) transactionData.supplierId = supplierId;

    onAddTransaction(transactionData);
    onClose();
  };
  
  const handleProductSelect = (productId: string) => {
      setSelectedProductId(productId);
      const product = productMap.get(productId);
      if (product) {
          const priceToSet = category === 'Trả hàng cho nhà cung cấp' ? product.purchasePrice : product.price;
          setCurrentPrice(String(priceToSet));
      }
  }

  const categories = type === TransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const isStockTransaction = ['Nhập hàng', 'Khách trả hàng', 'Trả hàng cho nhà cung cấp'].includes(category);
  const isCustomerReturn = category === 'Khách trả hàng';
  const isSupplierReturn = category === 'Trả hàng cho nhà cung cấp';

  // Show customer select for normal income transactions OR customer returns. Hide for supplier returns.
  const showCustomerSelect = (type === TransactionType.INCOME && !isSupplierReturn) || isCustomerReturn;

  // Show supplier select for normal expense transactions OR supplier returns. Hide for customer returns.
  const showSupplierSelect = (type === TransactionType.EXPENSE && !isCustomerReturn) || isSupplierReturn;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Thêm Giao Dịch Mới</h3>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
                <button type="button" onClick={() => handleTypeChange(TransactionType.EXPENSE)} className={`w-full py-2 rounded-md font-semibold transition-colors text-sm ${type === TransactionType.EXPENSE ? 'bg-white text-red-600 shadow' : 'text-gray-600'}`}>
                    Chi phí
                </button>
                <button type="button" onClick={() => handleTypeChange(TransactionType.INCOME)} className={`w-full py-2 rounded-md font-semibold transition-colors text-sm ${type === TransactionType.INCOME ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>
                    Thu nhập
                </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Danh mục</label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                >
                  <option value="" disabled>-- Chọn danh mục --</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

             {!isStockTransaction && (
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Số tiền (VND)</label>
                    <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="0"
                    required
                    />
                </div>
              )}
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Mô tả</label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder={isStockTransaction ? (isCustomerReturn ? "VD: Khách A trả hàng" : isSupplierReturn ? "VD: Trả hàng lỗi cho NCC B" : "VD: Nhập hàng đợt 1") : (type === TransactionType.EXPENSE ? "VD: Tiền điện tháng 5" : "VD: Bán hàng cho khách A")}
                  required
                />
              </div>
              
              {isStockTransaction && (
                <div className="border-t pt-4 space-y-4">
                    <h4 className="font-semibold text-gray-700">
                       {isCustomerReturn ? "Chi tiết hàng trả lại" : isSupplierReturn ? "Chi tiết trả hàng" : "Chi tiết nhập hàng"}
                    </h4>
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                        <select value={selectedProductId} onChange={e => handleProductSelect(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm text-sm">
                            <option value="">-- Chọn sản phẩm --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                             <input type="number" value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} placeholder="Số lượng" className="block w-full border-gray-300 rounded-md shadow-sm text-sm"/>
                             <input type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder={isCustomerReturn ? "Giá bán" : "Giá nhập"} className="block w-full border-gray-300 rounded-md shadow-sm text-sm"/>
                        </div>
                        <button type="button" onClick={handleAddLineItem} className="w-full text-sm bg-primary-100 text-primary-700 font-semibold py-2 rounded-md hover:bg-primary-200">Thêm vào phiếu</button>
                    </div>

                    {lineItems.length > 0 && (
                        <div>
                            <ul className="divide-y max-h-32 overflow-y-auto">
                                {lineItems.map(item => {
                                    const product = productMap.get(item.productId);
                                    return (
                                        <li key={item.productId} className="flex justify-between items-center text-sm py-1">
                                            <div>
                                                <p className="font-medium">{product?.name}</p>
                                                <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.price)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{formatCurrency(item.quantity * item.price)}</span>
                                                <button type="button" onClick={() => handleRemoveLineItem(item.productId)} className="text-red-500"><TrashIcon/></button>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                            <div className="flex justify-between font-bold text-md mt-2 pt-2 border-t">
                                <span>Tổng cộng:</span>
                                <span>{formatCurrency(totalPurchaseAmount)}</span>
                            </div>
                        </div>
                    )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Hình thức thanh toán</label>
                <div className="mt-1 grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                    <button type="button" onClick={() => setPaymentMethod('cash')} className={`w-full py-2 rounded-md font-semibold transition-colors text-sm ${paymentMethod === 'cash' ? 'bg-white text-primary-600 shadow' : 'text-gray-600'}`}>
                        Tiền mặt
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('bank')} className={`w-full py-2 rounded-md font-semibold transition-colors text-sm ${paymentMethod === 'bank' ? 'bg-white text-primary-600 shadow' : 'text-gray-600'}`}>
                        Chuyển khoản
                    </button>
                </div>
              </div>

              {showCustomerSelect && (
                 <div>
                      <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Khách hàng (Không bắt buộc)</label>
                      <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                        <option value="">-- Chọn khách hàng --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                 </div>
              )}
              {showSupplierSelect && (
                 <div>
                      <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">Nhà cung cấp (Không bắt buộc)</label>
                      <select id="supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                        <option value="">-- Chọn nhà cung cấp --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                 </div>
              )}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Ngày</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>
            </div>
             {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Lưu Giao Dịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;