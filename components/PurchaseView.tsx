import React, { useState, useMemo } from 'react';
import { Product, Supplier, Transaction, TransactionType } from '../types';
import { TrashIcon } from '../constants';

interface PurchaseViewProps {
  products: Product[];
  suppliers: Supplier[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

const PurchaseView: React.FC<PurchaseViewProps> = ({ products, suppliers, onAddTransaction }) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const addProductToOrder = (product: Product) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setOrderItems(prev =>
        prev.map(item =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const total = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.product.purchasePrice * item.quantity, 0);
  }, [orderItems]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const handleCheckout = () => {
    if (orderItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào phiếu nhập.");
      return;
    }
    if (!selectedSupplierId) {
      alert("Vui lòng chọn nhà cung cấp.");
      return;
    }

    const description = `Phiếu nhập hàng (${orderItems.length} sản phẩm)`;
    
    const newTransaction: Omit<Transaction, 'id'> = {
        amount: total,
        description,
        category: "Nhập hàng",
        date: new Date().toISOString().split('T')[0],
        type: TransactionType.EXPENSE,
        paymentMethod,
        supplierId: selectedSupplierId,
        lineItems: orderItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.purchasePrice
        })),
    };

    onAddTransaction(newTransaction);

    setOrderItems([]);
    setSelectedSupplierId('');
    alert("Tạo phiếu nhập hàng thành công!");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left side - Product List */}
      <div className="flex-1 lg:w-3/5 bg-white p-4 rounded-xl shadow-lg flex flex-col">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => (
                    <button
                        key={product.id}
                        onClick={() => addProductToOrder(product)}
                        className="p-3 border rounded-lg text-center hover:bg-primary-50 hover:border-primary-500 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <p className="font-semibold text-sm text-gray-800 truncate">{product.name}</p>
                        <p className="text-xs text-red-600 font-bold">{formatCurrency(product.purchasePrice)}</p>
                    </button>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Không tìm thấy sản phẩm.</p>
                </div>
            )}
        </div>
      </div>

      {/* Right side - Purchase Order */}
      <div className="lg:w-2/5 bg-white p-4 rounded-xl shadow-lg flex flex-col">
        <h2 className="text-xl font-bold text-gray-700 mb-4 pb-2 border-b">Phiếu Nhập Hàng</h2>
        
        <div className="mb-4">
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
            <select 
                id="supplier" 
                value={selectedSupplierId} 
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>

        <div className="flex-1 overflow-y-auto">
            {orderItems.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                    {orderItems.map(item => (
                        <li key={item.product.id} className="py-3 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-sm">{item.product.name}</p>
                                <p className="text-xs text-gray-500">{formatCurrency(item.product.purchasePrice)}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center border rounded-md">
                                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-2 py-1 text-lg font-bold">-</button>
                                    <input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                        className="w-12 text-center border-l border-r"
                                    />
                                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-2 py-1 text-lg font-bold">+</button>
                                </div>
                                <button onClick={() => updateQuantity(item.product.id, 0)} className="text-gray-400 hover:text-red-500 p-1"><TrashIcon /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Chưa có sản phẩm trong phiếu nhập.</p>
                </div>
            )}
        </div>
        
        <div className="border-t pt-4 mt-4 space-y-2">
             <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Thanh toán bằng:</span>
                <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
                    <button onClick={() => setPaymentMethod('cash')} className={`px-3 py-1 text-sm rounded-md ${paymentMethod === 'cash' ? 'bg-white shadow' : ''}`}>Tiền mặt</button>
                    <button onClick={() => setPaymentMethod('bank')} className={`px-3 py-1 text-sm rounded-md ${paymentMethod === 'bank' ? 'bg-white shadow' : ''}`}>Chuyển khoản</button>
                </div>
            </div>
             <div className="flex justify-between items-center text-xl font-bold text-red-700 pt-2">
                <span>Tổng tiền:</span>
                <span>{formatCurrency(total)}</span>
            </div>
            <button
                onClick={handleCheckout}
                disabled={orderItems.length === 0 || !selectedSupplierId}
                className="w-full mt-2 bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Tạo Phiếu Nhập
            </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseView;