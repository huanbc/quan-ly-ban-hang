
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Supplier, Transaction, TransactionType } from '../types';
import { TrashIcon, PlusIcon } from '../constants';
import AddEditSupplierModal from './AddEditSupplierModal';
import OCRPurchaseModal from './OCRPurchaseModal';

interface PurchaseViewProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>, callback?: (newSupplier: Supplier) => void) => void;
  onAddProduct: (product: Omit<Product, 'id'>, callback?: (newProduct: Product) => void) => void;
  onUpdateProduct: (product: Product) => void;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

const PurchaseView: React.FC<PurchaseViewProps> = ({ 
    products, 
    suppliers, 
    transactions, 
    onAddTransaction, 
    onAddSupplier, 
    onAddProduct, 
    onUpdateProduct 
}) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const supplierSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supplierSearchRef.current && !supplierSearchRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [supplierSearchRef]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm) return suppliers;
    return suppliers.filter(s => s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()));
  }, [suppliers, supplierSearchTerm]);

  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setSupplierSearchTerm(supplier.name);
    setIsSupplierDropdownOpen(false);
  };

  const handleAddNewSupplierClick = () => {
    setIsSupplierDropdownOpen(false);
    setIsAddSupplierModalOpen(true);
  };

  const handleSaveNewSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    onAddSupplier(supplierData, (newSupplier) => {
      setSelectedSupplierId(newSupplier.id);
      setSupplierSearchTerm(newSupplier.name);
    });
    setIsAddSupplierModalOpen(false);
  };
  
  const handleClearSupplier = () => {
    setSelectedSupplierId('');
    setSupplierSearchTerm('');
  };


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
    setSupplierSearchTerm('');
    alert("Tạo phiếu nhập hàng thành công!");
  };

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Left side - Product List */}
      <div className="flex-1 lg:w-3/5 bg-white p-4 rounded-xl shadow-lg flex flex-col">
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
          <button 
            onClick={() => setIsOCRModalOpen(true)}
            className="flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-2 rounded-lg hover:bg-primary-200 transition-colors shadow-sm whitespace-nowrap"
            title="Quét hóa đơn nhập hàng"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline font-medium">Quét hóa đơn</span>
          </button>
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
        
        <div className="mb-4" ref={supplierSearchRef}>
          <label htmlFor="supplier-search" className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
          <div className="relative">
            <input
              id="supplier-search"
              type="text"
              value={supplierSearchTerm}
              onChange={(e) => {
                setSupplierSearchTerm(e.target.value);
                if (selectedSupplierId) setSelectedSupplierId('');
                setIsSupplierDropdownOpen(true);
              }}
              onFocus={() => setIsSupplierDropdownOpen(true)}
              placeholder="Tìm hoặc thêm mới nhà cung cấp..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              autoComplete="off"
            />
            {selectedSupplierId && (
              <button
                onClick={handleClearSupplier}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                aria-label="Xóa nhà cung cấp đã chọn"
              >
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              </button>
            )}
            {isSupplierDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredSuppliers.map(supplier => (
                  <button
                    key={supplier.id}
                    onClick={() => handleSelectSupplier(supplier)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {supplier.name}
                  </button>
                ))}
                <button
                  onClick={handleAddNewSupplierClick}
                  className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100"
                >
                  <PlusIcon />
                  <span>Thêm mới nhà cung cấp "{supplierSearchTerm}"</span>
                </button>
              </div>
            )}
          </div>
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
    {isAddSupplierModalOpen && (
        <AddEditSupplierModal
          onClose={() => setIsAddSupplierModalOpen(false)}
          onSave={handleSaveNewSupplier}
          supplier={null}
        />
    )}
    {isOCRModalOpen && (
        <OCRPurchaseModal 
            onClose={() => setIsOCRModalOpen(false)}
            onAddTransaction={onAddTransaction}
            onAddProduct={onAddProduct}
            onUpdateProduct={onUpdateProduct}
            onAddSupplier={onAddSupplier}
            products={products}
            suppliers={suppliers}
            transactions={transactions}
        />
    )}
    </>
  );
};

export default PurchaseView;
