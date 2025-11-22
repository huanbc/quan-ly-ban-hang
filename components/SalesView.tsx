
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Customer, Transaction, TransactionType } from '../types';
import { TrashIcon, PlusIcon, CubeIcon } from '../constants';
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
  price: number; // Cho phép sửa giá bán trực tiếp
}

// Icons nội bộ cho giao diện POS
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ScanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

const UserCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
    </svg>
);

const SalesView: React.FC<SalesViewProps> = ({ products, customers, onAddTransaction, onAddCustomer }) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [manualDiscount, setManualDiscount] = useState('');
  const [orderNote, setOrderNote] = useState('');
  
  // Bộ lọc nhóm hàng
  const [selectedCategory, setSelectedCategory] = useState('all');

  // State tìm kiếm khách hàng
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

  // Lấy danh sách nhóm hàng từ sản phẩm
  const categories = useMemo(() => {
      const cats = new Set(products.map(p => p.subCategory).filter((c): c is string => !!c));
      return ['all', ...Array.from(cats).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'all' || p.subCategory === selectedCategory;
        return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || (c.phone && c.phone.includes(customerSearchTerm)));
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
      return [...prevItems, { product, quantity: 1, price: product.price }];
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
  
  const updatePrice = (productId: string, newPrice: number) => {
      setOrderItems(prev => 
        prev.map(item => 
            item.product.id === productId ? { ...item, price: newPrice } : item
        )
      );
  }

  const { subtotal, discount, total } = useMemo(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const parsedManualDiscount = parseFloat(manualDiscount) || 0;
    const total = Math.max(0, subtotal - parsedManualDiscount);

    return { subtotal, discount: parsedManualDiscount, total };
  }, [orderItems, manualDiscount]);

  const handleCheckout = () => {
    if (orderItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào hóa đơn.");
      return;
    }

    const customerName = customers.find(c => c.id === selectedCustomerId)?.name || 'Khách lẻ';
    const description = orderNote || `Bán hàng cho ${customerName}`;
    
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
            price: item.price
        })),
        discountAmount: discount,
    };

    onAddTransaction(newTransaction);

    // Reset state
    setOrderItems([]);
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setSearchTerm('');
    setPaymentMethod('cash');
    setManualDiscount('');
    setOrderNote('');
    alert("Thanh toán thành công!");
  };

  return (
    <>
    <div className="flex h-full bg-gray-100 gap-0 overflow-hidden">
        {/* LEFT COLUMN: Products (2/3 width) */}
        <div className="w-2/3 flex flex-col bg-gray-50 border-r border-gray-200 min-w-0">
            {/* Search & Filter Bar */}
            <div className="bg-white p-3 shadow-sm z-10 space-y-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm tên hoặc mã hàng hóa (F3)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow"
                            autoFocus
                        />
                    </div>
                    <button className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none flex items-center gap-2 whitespace-nowrap transition-colors">
                        <ScanIcon />
                        <span className="hidden sm:inline text-sm font-medium">Quét mã</span>
                    </button>
                </div>
                
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
                    <button 
                        onClick={() => setSelectedCategory('all')}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${selectedCategory === 'all' ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                    >
                        Tất cả
                    </button>
                    {categories.filter(c => c !== 'all').map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${selectedCategory === cat ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addProductToOrder(product)}
                                className="bg-white rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all transform hover:-translate-y-1 border border-gray-200 flex flex-col overflow-hidden group h-40"
                            >
                                <div className="flex-1 flex items-center justify-center bg-gray-50 relative group-hover:bg-blue-50 transition-colors">
                                    <div className="text-gray-400 group-hover:text-primary-500 transition-colors">
                                        {product.subCategory?.includes('Laptop') ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        ) : product.subCategory?.includes('PC') ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        ) : (
                                            <CubeIcon />
                                        )}
                                    </div>
                                    <span className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm text-gray-600 text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm border border-gray-100">
                                        SL: {product.initialStock}
                                    </span>
                                </div>
                                <div className="p-2.5 text-center bg-white border-t border-gray-100">
                                    <p className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1" title={product.name}>{product.name}</p>
                                    <p className="text-sm font-bold text-primary-600">{formatCurrency(product.price)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="bg-gray-200 p-4 rounded-full mb-3">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <p className="font-medium">Không tìm thấy hàng hóa nào.</p>
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: Invoice (1/3 width) */}
        <div className="w-1/3 bg-white flex flex-col shadow-xl z-20 border-l border-gray-200 h-full">
            {/* Customer Header */}
            <div className="p-3 border-b bg-gray-50">
                <div className="relative" ref={customerSearchRef}>
                    <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                            setCustomerSearchTerm(e.target.value);
                            if (selectedCustomerId) setSelectedCustomerId('');
                            setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Tìm khách hàng (F4)"
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow shadow-sm"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <UserCircleIcon />
                    </div>
                    <button 
                        className="absolute right-2 top-2 text-primary-600 hover:bg-primary-50 p-1 rounded transition-colors"
                        onClick={handleAddNewCustomerClick}
                        title="Thêm khách hàng mới"
                    >
                        <PlusIcon />
                    </button>

                    {isCustomerDropdownOpen && (
                        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                            <button
                                key={customer.id}
                                onClick={() => handleSelectCustomer(customer)}
                                className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-50 last:border-none transition-colors"
                            >
                                <div className="font-bold text-gray-800">{customer.name}</div>
                                <div className="text-xs text-gray-500">{customer.phone}</div>
                            </button>
                            )) : (
                                <div className="p-3 text-center text-sm text-gray-500 italic">Không tìm thấy khách hàng</div>
                            )}
                        </div>
                    )}
                </div>
                {selectedCustomerId && (
                    <div className="mt-2 flex justify-between items-center text-xs bg-blue-50 px-2 py-1 rounded text-blue-700 border border-blue-100">
                        <span className="font-semibold truncate max-w-[150px]">{customerSearchTerm}</span>
                        <button onClick={handleClearCustomer} className="hover:underline text-blue-800">Bỏ chọn</button>
                    </div>
                )}
            </div>

            {/* Cart List */}
            <div className="flex-1 overflow-y-auto bg-white px-2">
                {orderItems.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                        {orderItems.map((item, index) => (
                            <li key={`${item.product.id}-${index}`} className="py-3 hover:bg-gray-50 transition-colors group px-2 rounded-md">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-semibold text-gray-800 line-clamp-2">{item.product.name}</span>
                                    <button onClick={() => updateQuantity(item.product.id, 0)} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                        <TrashIcon />
                                    </button>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center border border-gray-300 rounded-md bg-white overflow-hidden h-8">
                                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-2.5 h-full text-gray-600 hover:bg-gray-100 border-r active:bg-gray-200 font-bold">-</button>
                                        <input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                            className="w-12 h-full text-center text-sm font-semibold border-none focus:ring-0 p-0"
                                        />
                                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-2.5 h-full text-gray-600 hover:bg-gray-100 border-l active:bg-gray-200 font-bold">+</button>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <input 
                                            type="number"
                                            value={item.price}
                                            onChange={e => updatePrice(item.product.id, parseFloat(e.target.value))}
                                            className="text-right text-sm font-bold text-primary-700 w-28 border-none p-0 bg-transparent focus:ring-0 hover:bg-gray-50 rounded cursor-pointer"
                                        />
                                        <span className="text-[10px] text-gray-400 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <p className="text-sm">Chưa có hàng hóa</p>
                    </div>
                )}
            </div>

            {/* Payment Section */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Tổng tiền hàng</span>
                    <span className="font-bold text-gray-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-medium">Giảm giá</span>
                    <div className="flex items-center w-32 border-b border-gray-300 focus-within:border-primary-500">
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={manualDiscount} 
                            onChange={e => setManualDiscount(e.target.value)} 
                            className="w-full text-right bg-transparent focus:outline-none text-sm p-1"
                        />
                    </div>
                </div>
                
                <div className="border-t border-dashed border-gray-300 my-2"></div>
                
                <div className="flex justify-between items-end mb-2">
                    <span className="text-gray-800 font-bold text-lg">Khách cần trả</span>
                    <span className="text-2xl font-extrabold text-primary-600">{formatCurrency(total)}</span>
                </div>

                {/* Payment Method */}
                <div className="flex bg-gray-200 p-1 rounded-lg mb-3">
                    <button 
                        onClick={() => setPaymentMethod('cash')} 
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${paymentMethod === 'cash' ? 'bg-white text-primary-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Tiền mặt
                    </button>
                    <button 
                        onClick={() => setPaymentMethod('bank')} 
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${paymentMethod === 'bank' ? 'bg-white text-primary-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Chuyển khoản
                    </button>
                </div>

                <input 
                    type="text" 
                    placeholder="Ghi chú đơn hàng..." 
                    value={orderNote}
                    onChange={e => setOrderNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 mb-2"
                />

                <div className="flex gap-3 pt-2">
                    <button className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-lg shadow text-sm uppercase transition-colors">
                        In phiếu
                    </button>
                    <button 
                        onClick={handleCheckout}
                        disabled={orderItems.length === 0}
                        className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-lg text-base uppercase transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        Thanh toán
                    </button>
                </div>
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
