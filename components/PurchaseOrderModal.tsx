
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Supplier, Transaction, TransactionType } from '../types';
import { TrashIcon, PlusIcon, CubeIcon, ArchiveBoxArrowDownIcon } from '../constants';
import AddEditSupplierModal from './AddEditSupplierModal';
import { formatCurrency } from '../utils';

interface PurchaseOrderModalProps {
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>, callback?: (newSupplier: Supplier) => void) => void;
  onUpdateProduct: (product: Product) => void;
}

interface OrderItem {
  product: Product;
  quantity: number;
  price: number; // Giá nhập
}

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const TruckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H6V6h10v4l4 4v3h-3zM6 17H3v-4l4-4h2" />
    </svg>
);

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ 
    onClose,
    products, 
    suppliers, 
    transactions,
    onAddTransaction, 
    onAddSupplier,
    onUpdateProduct
}) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [orderNote, setOrderNote] = useState('');
  
  // Bộ lọc nhóm hàng
  const [selectedCategory, setSelectedCategory] = useState('all');

  // State tìm kiếm NCC
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
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

  const addProductToOrder = (product: Product) => {
    setOrderItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { product, quantity: 1, price: product.purchasePrice }];
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

  const total = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [orderItems]);

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

  const handleCheckout = () => {
    if (orderItems.length === 0) {
      alert("Vui lòng thêm sản phẩm vào phiếu nhập.");
      return;
    }
    if (!selectedSupplierId) {
        alert("Vui lòng chọn nhà cung cấp.");
        return;
    }

    // 1. Update Product Prices (Weighted Average)
    orderItems.forEach(item => {
        const currentStock = calculateCurrentStock(item.product.id);
        let newCostPrice = item.price; // Default to new price if stock is 0 or negative

        if (currentStock > 0) {
            const currentTotalValue = currentStock * item.product.purchasePrice;
            const newImportValue = item.quantity * item.price;
            newCostPrice = (currentTotalValue + newImportValue) / (currentStock + item.quantity);
        }

        // Call update product
        onUpdateProduct({
            ...item.product,
            purchasePrice: newCostPrice
        });
    });

    // 2. Create Transaction
    const description = orderNote || `Nhập hàng từ ${suppliers.find(s => s.id === selectedSupplierId)?.name}`;
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
            price: item.price
        })),
    };

    onAddTransaction(newTransaction);
    alert("Nhập hàng thành công! Giá vốn đã được cập nhật.");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full h-full max-w-[98vw] max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 px-4 border-b bg-gray-50">
                <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                    <ArchiveBoxArrowDownIcon />
                    Nhập Hàng
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl transition-colors">&times;</button>
            </div>

            <div className="flex-1 flex h-full overflow-hidden">
                {/* LEFT COLUMN: Products (2/3 width) */}
                <div className="w-2/3 flex flex-col bg-gray-50 border-r border-gray-200 min-w-0">
                    {/* Search & Filter Bar */}
                    <div className="bg-white p-3 shadow-sm z-10 space-y-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <SearchIcon />
                            </div>
                            <input
                                type="text"
                                placeholder="Tìm hàng hóa để nhập..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                autoFocus
                            />
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
                                            {product.subCategory && (
                                                <span className="absolute top-1 left-1 bg-gray-100 text-gray-600 text-[9px] font-medium px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[80px]">
                                                    {product.subCategory}
                                                </span>
                                            )}
                                            <span className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm text-gray-600 text-[10px] font-medium px-1.5 py-0.5 rounded shadow-sm border border-gray-100">
                                                Tồn: {product.initialStock}
                                            </span>
                                        </div>
                                        <div className="p-2.5 text-center bg-white border-t border-gray-100">
                                            <p className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1" title={product.name}>{product.name}</p>
                                            <p className="text-xs text-gray-500">Giá nhập: <span className="font-bold text-red-600">{formatCurrency(product.purchasePrice)}</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <p className="font-medium">Không tìm thấy hàng hóa nào.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Order Details (1/3 width) */}
                <div className="w-1/3 bg-white flex flex-col shadow-xl z-20 border-l border-gray-200 h-full">
                    {/* Supplier Header */}
                    <div className="p-3 border-b bg-gray-50">
                        <div className="relative" ref={supplierSearchRef}>
                            <input
                                type="text"
                                value={supplierSearchTerm}
                                onChange={(e) => {
                                    setSupplierSearchTerm(e.target.value);
                                    if (selectedSupplierId) setSelectedSupplierId('');
                                    setIsSupplierDropdownOpen(true);
                                }}
                                onFocus={() => setIsSupplierDropdownOpen(true)}
                                placeholder="Tìm nhà cung cấp (F4)"
                                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow shadow-sm"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <TruckIcon />
                            </div>
                            <button 
                                className="absolute right-2 top-2 text-primary-600 hover:bg-primary-50 p-1 rounded transition-colors"
                                onClick={handleAddNewSupplierClick}
                                title="Thêm nhà cung cấp mới"
                            >
                                <PlusIcon />
                            </button>

                            {isSupplierDropdownOpen && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {filteredSuppliers.length > 0 ? filteredSuppliers.map(supplier => (
                                    <button
                                        key={supplier.id}
                                        onClick={() => handleSelectSupplier(supplier)}
                                        className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-50 last:border-none transition-colors"
                                    >
                                        <div className="font-bold text-gray-800">{supplier.name}</div>
                                        <div className="text-xs text-gray-500">{supplier.phone}</div>
                                    </button>
                                    )) : (
                                        <div className="p-3 text-center text-sm text-gray-500 italic">Không tìm thấy NCC</div>
                                    )}
                                </div>
                            )}
                        </div>
                        {selectedSupplierId && (
                            <div className="mt-2 flex justify-between items-center text-xs bg-purple-50 px-2 py-1 rounded text-purple-700 border border-purple-100">
                                <span className="font-semibold truncate max-w-[150px]">{supplierSearchTerm}</span>
                                <button onClick={handleClearSupplier} className="hover:underline text-purple-800">Bỏ chọn</button>
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
                                            <div>
                                                <span className="text-sm font-semibold text-gray-800 line-clamp-2">{item.product.name}</span>
                                                <span className="text-[10px] text-gray-500 block">{item.product.subCategory || ''}</span>
                                            </div>
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
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-400">Giá nhập:</span>
                                                    <input 
                                                        type="number"
                                                        value={item.price}
                                                        onChange={e => updatePrice(item.product.id, parseFloat(e.target.value))}
                                                        className="text-right text-sm font-bold text-red-600 w-24 border-b border-gray-200 border-t-0 border-l-0 border-r-0 p-0 bg-transparent focus:ring-0 focus:border-red-500"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium mt-1">{formatCurrency(item.price * item.quantity)}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                                <ArchiveBoxArrowDownIcon />
                                <p className="text-sm mt-2">Chưa có hàng hóa nhập</p>
                            </div>
                        )}
                    </div>

                    {/* Payment Section */}
                    <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-800 font-bold text-lg">Tổng tiền nhập</span>
                            <span className="text-2xl font-extrabold text-red-600">{formatCurrency(total)}</span>
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
                            placeholder="Ghi chú phiếu nhập..." 
                            value={orderNote}
                            onChange={e => setOrderNote(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 mb-2"
                        />

                        <button 
                            onClick={handleCheckout}
                            disabled={orderItems.length === 0 || !selectedSupplierId}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-lg text-base uppercase transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            Hoàn thành nhập hàng
                        </button>
                    </div>
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
    </div>
  );
};

export default PurchaseOrderModal;
