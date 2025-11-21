import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Customer, Transaction, TransactionType } from '../types';
import { TrashIcon, PlusIcon } from '../constants';
import AddEditCustomerModal from './AddEditCustomerModal';

interface SalesViewProps {
  products: Product[];
  customers: Customer[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddCustomer: (customer: Omit<Customer, 'id'>, callback?: (newCustomer: Customer) => void) => void;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

type AppliedPromo = {
    code: string;
    type: 'fixed' | 'percent';
    value: number;
};

const SalesView: React.FC<SalesViewProps> = ({ products, customers, onAddTransaction, onAddCustomer }) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [promotionCode, setPromotionCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [manualDiscount, setManualDiscount] = useState('');

  // State for new customer search/add functionality
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [customerSearchRef]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()));
  }, [customers, customerSearchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchTerm(customer.name);
    setIsCustomerDropdownOpen(false);
  };

  const handleAddNewCustomerClick = () => {
    setIsCustomerDropdownOpen(false);
    setIsAddCustomerModalOpen(true);
  };

  const handleSaveNewCustomer = (customerData: Omit<Customer, 'id'>) => {
    onAddCustomer(customerData, (newCustomer) => {
      setSelectedCustomerId(newCustomer.id);
      setCustomerSearchTerm(newCustomer.name);
    });
    setIsAddCustomerModalOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
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

  const { subtotal, vatAmount, discount, total } = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const vatAmount = orderItems.reduce((sum, item) => {
        const itemVatRate = (item.product.vat || 0) / 100;
        const itemTotal = item.product.price * item.quantity;
        return sum + (itemTotal * itemVatRate);
    }, 0);

    let promoDiscount = 0;
    if (appliedPromo && subtotal > 0) {
      if (appliedPromo.type === 'fixed') {
        promoDiscount = appliedPromo.value;
      } else { // 'percent'
        promoDiscount = subtotal * (appliedPromo.value / 100);
      }
    }
    
    const parsedManualDiscount = parseFloat(manualDiscount) || 0;
    const totalDiscount = promoDiscount + parsedManualDiscount;
    const total = Math.max(0, subtotal + vatAmount - totalDiscount);

    return { subtotal, vatAmount, discount: totalDiscount, total };
  }, [orderItems, appliedPromo, manualDiscount]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const handleApplyPromo = () => {
    // Hardcoded promo codes for demonstration
    const codeUpper = promotionCode.toUpperCase();
    if (codeUpper === 'GIAM10') {
      setAppliedPromo({ code: 'GIAM10', type: 'percent', value: 10 });
    } else if (codeUpper === 'SALE50K') {
      setAppliedPromo({ code: 'SALE50K', type: 'fixed', value: 50000 });
    } else {
      alert('Mã khuyến mại không hợp lệ!');
      setAppliedPromo(null);
    }
  };
  
  const handleClearPromo = () => {
    setPromotionCode('');
    setAppliedPromo(null);
  }

  const handleCheckout = () => {
    if (orderItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào hóa đơn.");
      return;
    }

    const description = `Hóa đơn bán hàng (${orderItems.length} sản phẩm)`;
    
    const newTransaction: Omit<Transaction, 'id'> = {
        amount: total,
        description,
        category: "Bán hàng",
        date: new Date().toISOString().split('T')[0],
        type: TransactionType.INCOME,
        paymentMethod,
        ...(selectedCustomerId && { customerId: selectedCustomerId }),
        lineItems: orderItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price
        })),
        discountAmount: discount,
        promotionCode: appliedPromo?.code,
    };

    onAddTransaction(newTransaction);

    // Reset state
    setOrderItems([]);
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setSearchTerm('');
    setPaymentMethod('cash');
    setPromotionCode('');
    setAppliedPromo(null);
    setManualDiscount('');
    alert("Thanh toán thành công!");
  };

  return (
    <>
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
                        <p className="text-xs text-primary-600 font-bold">{formatCurrency(product.price)}</p>
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

      {/* Right side - Invoice/Cart */}
      <div className="lg:w-2/5 bg-white p-4 rounded-xl shadow-lg flex flex-col">
        <h2 className="text-xl font-bold text-gray-700 mb-4 pb-2 border-b">Hóa Đơn</h2>
        
        <div className="mb-4" ref={customerSearchRef}>
          <label htmlFor="customer-search" className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
          <div className="relative">
            <input
              id="customer-search"
              type="text"
              value={customerSearchTerm}
              onChange={(e) => {
                setCustomerSearchTerm(e.target.value);
                if (selectedCustomerId) setSelectedCustomerId('');
                setIsCustomerDropdownOpen(true);
              }}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              placeholder="Tìm hoặc thêm mới khách hàng..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              autoComplete="off"
            />
            {selectedCustomerId && (
              <button
                onClick={handleClearCustomer}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                aria-label="Xóa khách hàng đã chọn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              </button>
            )}
            {isCustomerDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {customer.name}
                  </button>
                ))}
                <button
                  onClick={handleAddNewCustomerClick}
                  className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100"
                >
                  <PlusIcon />
                  <span>Thêm mới khách hàng "{customerSearchTerm}"</span>
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
                                <p className="text-xs text-gray-500">{formatCurrency(item.product.price)}</p>
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
                    <p>Chưa có sản phẩm trong hóa đơn.</p>
                </div>
            )}
        </div>
        
        <div className="border-t pt-4 mt-4 space-y-2">
            <div className="flex justify-between items-center text-md">
                <span className="text-gray-600">Tổng tiền hàng:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-md">
                <span className="text-gray-600">Thuế GTGT:</span>
                <span className="font-semibold">{formatCurrency(vatAmount)}</span>
            </div>
             <div className="my-2 border-t"></div>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <input type="text" placeholder="Mã khuyến mại" value={promotionCode} onChange={e => setPromotionCode(e.target.value)} className="flex-grow p-2 text-sm border border-gray-300 rounded-lg"/>
                    <button onClick={handleApplyPromo} className="px-3 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200">Áp dụng</button>
                </div>
                {appliedPromo && (
                    <div className="flex justify-between items-center text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                        <span>Đã áp dụng mã: <strong>{appliedPromo.code}</strong></span>
                        <button onClick={handleClearPromo} className="font-bold text-red-500">&times;</button>
                    </div>
                )}
                 <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Giảm giá trực tiếp:</span>
                    <input type="number" placeholder="0" value={manualDiscount} onChange={e => setManualDiscount(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-lg text-right"/>
                </div>
            </div>
            {discount > 0 && (
                <div className="flex justify-between items-center text-md text-red-600">
                    <span className="font-semibold">Tổng giảm giá:</span>
                    <span className="font-bold">- {formatCurrency(discount)}</span>
                </div>
            )}
             <div className="my-2 border-t"></div>
             <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Thanh toán bằng:</span>
                <div className="flex items-center rounded-lg bg-gray-100 p-0.5">
                    <button onClick={() => setPaymentMethod('cash')} className={`px-3 py-1 text-sm rounded-md ${paymentMethod === 'cash' ? 'bg-white shadow' : ''}`}>Tiền mặt</button>
                    <button onClick={() => setPaymentMethod('bank')} className={`px-3 py-1 text-sm rounded-md ${paymentMethod === 'bank' ? 'bg-white shadow' : ''}`}>Chuyển khoản</button>
                </div>
            </div>
             <div className="flex justify-between items-center text-xl font-bold text-primary-700 pt-2">
                <span>Khách cần trả:</span>
                <span>{formatCurrency(total)}</span>
            </div>
            <button
                onClick={handleCheckout}
                disabled={orderItems.length === 0}
                className="w-full mt-2 bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Thanh Toán
            </button>
        </div>
      </div>
    </div>
    {isAddCustomerModalOpen && (
        <AddEditCustomerModal
          onClose={() => setIsAddCustomerModalOpen(false)}
          onSave={handleSaveNewCustomer}
          customer={null}
        />
    )}
    </>
  );
};

export default SalesView;