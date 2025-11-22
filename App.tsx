

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Customer, Product, Supplier, Employee, UserRole, BusinessDetails, AppData } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import PurchaseView from './components/PurchaseView';
import CustomerList from './components/CustomerList';
import ProductList from './components/ProductList';
import SupplierList from './components/SupplierList';
import ReportsView from './components/ReportsView';
import LedgerView from './components/LedgerView';
import EmployeeList from './components/EmployeeList';
import AddTransactionModal from './components/AddTransactionModal';
import SalesView from './components/SalesView';
import LandingPage from './components/LandingPage';
import DataBackupView from './components/DataBackupView';
import { PlusIcon, ChartIcon, ListIcon, UsersIcon, CubeIcon, TruckIcon, ShoppingCartIcon, DocumentReportIcon, BookOpenIcon, IdentificationIcon, ArchiveBoxArrowDownIcon, HomeIcon, CurrencyDollarIcon, CloudArrowUpIcon } from './constants';
import { generateId } from './utils';

type View = 'dashboard' | 'transactions' | 'customers' | 'products' | 'suppliers' | 'sales' | 'purchase' | 'reports' | 'ledger' | 'employees' | 'backup';

const initialBusinessDetails: BusinessDetails = {
    taxpayerName: 'Hoàng Văn Phan',
    storeName: 'CỬA HÀNG KINH DOANH',
    bankAccount: '',
    taxId: '',
    businessLines: [
      { code: '47110', name: 'Bán lẻ lương thực, thực phẩm, đồ uống, thuốc lá, thuốc lào chiếm tỷ trọng lớn trong các cửa hàng kinh doanh tổng hợp' },
    ],
    address: '',
    phone: '',
    email: '',
};


const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(initialBusinessDetails);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');

  const useLocalStorage = <T,>(key: string, state: T, setState: React.Dispatch<React.SetStateAction<T>>, initialState: T) => {
    useEffect(() => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          setState(JSON.parse(stored));
        }
      } catch (error) {
        console.error(`Failed to load ${key} from localStorage:`, error);
        setState(initialState);
      }
    }, []);

    useEffect(() => {
      try {
        if (state !== undefined && state !== null) {
          localStorage.setItem(key, JSON.stringify(state));
        }
      } catch (error) {
        console.error(`Failed to save ${key} to localStorage:`, error);
      }
    }, [key, state]);
  };

  useLocalStorage('transactions', transactions, setTransactions, []);
  useLocalStorage('customers', customers, setCustomers, []);
  useLocalStorage('products', products, setProducts, []);
  useLocalStorage('suppliers', suppliers, setSuppliers, []);
  useLocalStorage('employees', employees, setEmployees, []);
  useLocalStorage('businessDetails', businessDetails, setBusinessDetails, initialBusinessDetails);
  
  useEffect(() => {
    // Initialize default admin if no employees exist
    if (employees.length === 0) {
      const admin: Employee = { 
          id: generateId(), 
          name: 'Admin', 
          role: UserRole.ADMIN,
          username: 'admin',
          password: '123'
      };
      setEmployees([admin]);
    }
  }, [employees]);

  // Auto-login effect
  useEffect(() => {
      const savedAuth = localStorage.getItem('saved_auth');
      if (savedAuth && employees.length > 0 && !currentUser) {
          try {
              const { username, password } = JSON.parse(savedAuth);
              const user = employees.find(u => u.username === username && u.password === password);
              if (user) {
                  setCurrentUser(user);
                  setShowLanding(false); // Skip landing page on auto-login
              }
          } catch (e) {
              console.error("Auto-login failed", e);
              localStorage.removeItem('saved_auth');
          }
      }
  }, [employees]);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const user = employees.find(u => u.username === loginUsername && u.password === loginPassword);
      
      if (user) {
          setCurrentUser(user);
          setLoginError('');
          
          if (rememberMe) {
              localStorage.setItem('saved_auth', JSON.stringify({ username: loginUsername, password: loginPassword }));
          } else {
              localStorage.removeItem('saved_auth');
          }

          setLoginUsername('');
          setLoginPassword('');
      } else {
          setLoginError('Tên tài khoản hoặc mật khẩu không chính xác.');
      }
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setActiveView('dashboard');
      localStorage.removeItem('saved_auth'); // Clear auto-login on explicit logout
  };


  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: generateId() };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const crudOperations = <T extends {id: string}>(state: T[], setState: React.Dispatch<React.SetStateAction<T[]>>) => ({
    add: (item: Omit<T, 'id'>, callback?: (newItem: T) => void) => {
      const newItem = { ...item, id: generateId() } as T;
      setState(prev => [...prev, newItem]);
      if (callback) {
        callback(newItem);
      }
    },
    batchAdd: (items: Omit<T, 'id'>[]) => {
      const newItems = items.map(item => ({ ...item, id: generateId() })) as T[];
      setState(prev => [...prev, ...newItems]);
    },
    update: (updatedItem: T) => {
      setState(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    },
    delete: (id: string) => {
      setState(prev => prev.filter(item => item.id !== id));
    }
  });

  const customerOps = crudOperations(customers, setCustomers);
  const productOps = crudOperations(products, setProducts);
  const supplierOps = crudOperations(suppliers, setSuppliers);
  const employeeOps = crudOperations(employees, setEmployees);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);
  
  const VIEW_PERMISSIONS: Record<View, UserRole[]> = {
    dashboard: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALES, UserRole.WAREHOUSE],
    sales: [UserRole.ADMIN, UserRole.SALES],
    purchase: [UserRole.ADMIN, UserRole.WAREHOUSE, UserRole.ACCOUNTANT],
    transactions: [UserRole.ADMIN, UserRole.ACCOUNTANT],
    customers: [UserRole.ADMIN, UserRole.SALES, UserRole.ACCOUNTANT],
    suppliers: [UserRole.ADMIN, UserRole.WAREHOUSE, UserRole.ACCOUNTANT],
    products: [UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTANT],
    ledger: [UserRole.ADMIN, UserRole.ACCOUNTANT],
    reports: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SALES, UserRole.WAREHOUSE],
    employees: [UserRole.ADMIN],
    backup: [UserRole.ADMIN],
  };
  
  const hasPermission = (view: View) => {
      if (!currentUser) return false;
      return VIEW_PERMISSIONS[view].includes(currentUser.role);
  };
  
  useEffect(() => {
    // If current view is no longer permitted after user change, switch to dashboard
    if (!hasPermission(activeView)) {
        setActiveView('dashboard');
    }
  }, [currentUser, activeView]);

  // Backup Data Helpers
  const getCurrentData = (): AppData => {
      return {
          transactions,
          customers,
          products,
          suppliers,
          employees,
          businessDetails,
          updatedAt: new Date().toISOString()
      };
  };

  const onRestoreData = (data: AppData) => {
      if (data.transactions) setTransactions(data.transactions);
      if (data.customers) setCustomers(data.customers);
      if (data.products) setProducts(data.products);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.employees) setEmployees(data.employees);
      if (data.businessDetails) setBusinessDetails(data.businessDetails);
      alert("Khôi phục dữ liệu thành công!");
  };
  
  const handleRestoreFromLanding = (data: AppData) => {
      onRestoreData(data);
      setShowLanding(false);
  };


  const NavItem = ({ view, label, icon, mobile = false, onClick }: { view: View, label: string, icon: React.ReactElement, mobile?: boolean, onClick?: () => void }) => {
    if (!hasPermission(view) && view !== 'transactions') return null; // Exception for 'transactions' view check for 'Thu - Chi' button which uses 'transactions' view permission essentially or generic
    
    // Special check for "Thu - Chi" button which reuses the generic 'transactions' view key for permission but isn't a view itself in this context
    if (label === "Thu - Chi" && !currentUser) return null;

    const isActive = activeView === view && !onClick;
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            setActiveView(view);
        }
        if (!mobile) {
            setIsSidebarOpen(false);
        }
    };

    if (mobile) {
         return (
             <button
              onClick={handleClick}
              className={`flex flex-col items-center justify-center w-full rounded-md py-2 px-1 text-xs font-medium transition-colors ${isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {icon}
              <span className="truncate">{label}</span>
            </button>
         )
    }
    return (
        <button
            onClick={handleClick}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
        >
            <div className="flex-shrink-0">{icon}</div>
            <span className={`text-sm transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>{label}</span>
        </button>
    );
  };
  
  const UserSelector = () => (
    <div className="mt-auto pt-4 border-t border-gray-200">
        <div className={`flex items-center gap-3 px-2 mb-3 ${!isSidebarOpen ? 'justify-center' : ''}`}>
             <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold flex-shrink-0">
                 {currentUser?.name.charAt(0)}
             </div>
             <div className={`overflow-hidden transition-all duration-200 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}>
                 <p className="text-sm font-medium text-gray-700 truncate">{currentUser?.name}</p>
                 <p className="text-xs text-gray-500 truncate">{currentUser?.role}</p>
             </div>
        </div>
         <button
            onClick={handleLogout}
            className={`w-full py-2 text-sm text-center text-red-600 hover:bg-red-50 rounded-md transition-colors ${!isSidebarOpen ? 'opacity-0 hidden' : 'opacity-100'}`}
        >
            Đăng xuất
        </button>
    </div>
  );


  const renderContent = () => {
    if (!currentUser || !hasPermission(activeView)) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl font-bold text-red-600">Truy cập bị từ chối</h2>
                <p className="text-gray-600">Bạn không có quyền truy cập chức năng này. Vui lòng chọn chức năng khác.</p>
            </div>
        )
    }
    
    switch (activeView) {
      case 'dashboard': return <Dashboard transactions={transactions} customers={customers} suppliers={suppliers} currentUser={currentUser} businessDetails={businessDetails} onUpdateBusinessDetails={setBusinessDetails} />;
      case 'transactions': return <TransactionList transactions={sortedTransactions} onDelete={deleteTransaction} customers={customers} suppliers={suppliers} products={products} />;
      case 'purchase': return <PurchaseView products={products} suppliers={suppliers} transactions={transactions} onAddTransaction={addTransaction} onAddSupplier={supplierOps.add} onAddProduct={productOps.add} onUpdateProduct={productOps.update} />;
      case 'customers': return <CustomerList customers={customers} transactions={transactions} onAdd={customerOps.add} onUpdate={customerOps.update} onDelete={customerOps.delete} />;
      case 'products': return <ProductList products={products} onAdd={productOps.add} onUpdate={productOps.update} onDelete={productOps.delete} onBatchAdd={productOps.batchAdd} transactions={transactions} suppliers={suppliers} />;
      case 'suppliers': return <SupplierList suppliers={suppliers} transactions={transactions} onAdd={supplierOps.add} onUpdate={supplierOps.update} onDelete={supplierOps.delete} />;
      case 'reports': return <ReportsView transactions={transactions} customers={customers} suppliers={suppliers} products={products} currentUser={currentUser}/>;
      case 'ledger': return <LedgerView transactions={transactions} products={products} customers={customers} suppliers={suppliers} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} onAddProduct={productOps.add} />;
      case 'employees': return <EmployeeList employees={employees} onAdd={employeeOps.add} onUpdate={employeeOps.update} onDelete={employeeOps.delete} />;
      case 'backup': return <DataBackupView getCurrentData={getCurrentData} onRestoreData={onRestoreData} />;
      default: return <Dashboard transactions={transactions} customers={customers} suppliers={suppliers} currentUser={currentUser} businessDetails={businessDetails} onUpdateBusinessDetails={setBusinessDetails} />;
    }
  }
  
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} onRestore={handleRestoreFromLanding} />;
  }

  if (!currentUser) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center mb-6">
                     <div className="inline-block p-3 rounded-full bg-primary-100 text-primary-600 mb-2">
                         <IdentificationIcon />
                     </div>
                    <h1 className="text-2xl font-bold text-gray-800">Đăng Nhập</h1>
                    <p className="text-gray-600 text-sm mt-1">Hệ thống sổ sách kế toán</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên tài khoản</label>
                        <input 
                            type="text" 
                            value={loginUsername}
                            onChange={e => setLoginUsername(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Nhập tên tài khoản"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                        <input 
                            type="password" 
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Nhập mật khẩu"
                            required
                        />
                    </div>
                    
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                            Lưu mật khẩu và truy cập nhanh
                        </label>
                    </div>
                    
                    {loginError && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                            {loginError}
                        </div>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                    >
                        Đăng nhập
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                    <button onClick={() => setShowLanding(true)} className="text-sm text-gray-500 hover:text-primary-600">
                        &larr; Quay lại trang giới thiệu
                    </button>
                </div>
            </div>
            
            <div className="mt-8 text-center text-gray-500 text-xs">
                <p className="font-bold uppercase">Sổ Sách Kế Toán</p>
                <p className="mt-1">Tác giả: Lê Minh Huấn | SĐT: 0912.041.201</p>
            </div>
        </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 flex">
        {/* Sidebar for Desktop - Sliding Drawer Style */}
        <aside 
            className={`hidden md:flex flex-col fixed top-0 left-0 h-full z-40 bg-white border-r border-gray-200 p-4 space-y-2 overflow-y-auto transition-all duration-300 ease-in-out shadow-xl ${
                isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-[15rem]' // Keep 1rem visible
            }`}
            onMouseEnter={() => setIsSidebarOpen(true)}
            onMouseLeave={() => setIsSidebarOpen(false)}
        >
            {/* Decorative strip when closed */}
            <div className={`absolute right-0 top-0 bottom-0 w-4 cursor-pointer ${isSidebarOpen ? 'hidden' : 'block'}`} />

            <div className="px-2 mb-4 flex items-center justify-between">
                 <h1 className={`text-lg font-bold text-primary-700 cursor-pointer transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setActiveView('dashboard')}>Sổ Sách Kế Toán</h1>
                 <button onClick={() => setShowLanding(true)} className={`p-1 text-gray-400 hover:text-primary-600 transition-colors ${!isSidebarOpen ? 'opacity-0' : ''}`} title="Về trang giới thiệu">
                    <HomeIcon />
                 </button>
            </div>
            <NavItem view="dashboard" label="Tổng Quan" icon={<ChartIcon />} />
            <NavItem view="sales" label="Bán Hàng (POS)" icon={<ShoppingCartIcon />} onClick={() => setShowSalesModal(true)} />
            <NavItem view="purchase" label="Nhập Hàng" icon={<ArchiveBoxArrowDownIcon />} />
            <NavItem view="transactions" label="Giao Dịch" icon={<ListIcon />} />
            <NavItem view="customers" label="Khách Hàng" icon={<UsersIcon />} />
            <NavItem view="suppliers" label="Nhà Cung Cấp" icon={<TruckIcon />} />
            <NavItem view="products" label="Hàng Hóa" icon={<CubeIcon />} />
            
            {/* Nút Thu - Chi mới được thêm vào đây */}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ACCOUNTANT) && (
                <NavItem 
                    view="transactions" // Reusing transactions permission logic
                    label="Thu - Chi" 
                    icon={<CurrencyDollarIcon />} 
                    onClick={() => { setIsModalOpen(true); setIsSidebarOpen(false); }} 
                />
            )}

            <NavItem view="ledger" label="Sổ Sách" icon={<BookOpenIcon />} onClick={() => setShowLedgerModal(true)} />
            <NavItem view="reports" label="Báo Cáo" icon={<DocumentReportIcon />} />
            <NavItem view="backup" label="Sao lưu dữ liệu" icon={<CloudArrowUpIcon />} />
            <NavItem view="employees" label="Nhân Viên" icon={<IdentificationIcon />} />
             
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SALES) && (
                <button
                    onClick={() => {
                        setShowSalesModal(true);
                        setIsSidebarOpen(false);
                    }}
                    className={`w-full mt-4 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105 ${!isSidebarOpen ? 'opacity-0' : 'opacity-100'}`}
                    aria-label="Bán hàng"
                >
                    <ShoppingCartIcon />
                    <span className="text-sm font-semibold">Bán Hàng</span>
                </button>
            )}

            <UserSelector />
            
            <div className={`text-xs text-center text-gray-400 mt-4 border-t border-gray-200 pt-4 pb-4 transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                <p className="font-bold text-gray-600 uppercase">Sổ Sách Kế Toán</p>
                <p className="mt-1">Tác giả: Lê Minh Huấn</p>
                <p>SĐT: 0912.041.201</p>
            </div>
        </aside>

        <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-4'}`}>
            <header className="bg-white shadow-sm sticky top-0 z-10 md:hidden p-4 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                     <button onClick={() => setShowLanding(true)} className="text-primary-700">
                        <HomeIcon />
                     </button>
                     <h1 className="text-xl sm:text-2xl font-bold text-primary-700">Sổ Sách Kế Toán</h1>
                 </div>
                 <div>
                     <button 
                        onClick={handleLogout}
                        className="text-sm text-red-600 font-medium"
                     >
                        Đăng xuất
                     </button>
                 </div>
            </header>
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 flex flex-col">
                <div className="flex-1">
                   {renderContent()}
                </div>
                
                {/* Main Content Footer - Visible on all screens */}
                <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                    <p className="font-bold text-primary-700 uppercase text-sm">Sổ Sách Kế Toán</p>
                    <p className="text-xs text-gray-500 mt-1">Tác giả: Lê Minh Huấn | SĐT: 0912.041.201</p>
                </div>
            </main>
        </div>
      
      {/* Bottom Nav for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 grid grid-cols-5 gap-1 p-1 z-20 md:hidden">
        <NavItem view="dashboard" label="Tổng quan" icon={<ChartIcon />} mobile />
        <NavItem view="sales" label="Bán Hàng" icon={<ShoppingCartIcon />} onClick={() => setShowSalesModal(true)} mobile />
        <NavItem view="purchase" label="Nhập hàng" icon={<ArchiveBoxArrowDownIcon />} mobile />
        <NavItem view="products" label="Hàng hóa" icon={<CubeIcon />} mobile />
        <NavItem view="reports" label="Báo cáo" icon={<DocumentReportIcon />} mobile />
      </div>

      {isModalOpen && (
        <AddTransactionModal
          onClose={() => setIsModalOpen(false)}
          onAddTransaction={addTransaction}
          customers={customers}
          suppliers={suppliers}
          products={products}
        />
      )}

      {/* Ledger Popup Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full h-full max-w-[95vw] max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-primary-700 flex items-center gap-2">
                        <BookOpenIcon />
                        Sổ Sách Kế Toán
                    </h2>
                    <button onClick={() => setShowLedgerModal(false)} className="text-gray-500 hover:text-red-500 text-2xl transition-colors">&times;</button>
                 </div>
                 <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                    <LedgerView 
                        transactions={transactions} 
                        products={products} 
                        customers={customers} 
                        suppliers={suppliers} 
                        onAddTransaction={addTransaction} 
                        onUpdateTransaction={updateTransaction} 
                        onDeleteTransaction={deleteTransaction} 
                        onAddProduct={productOps.add} 
                    />
                 </div>
            </div>
        </div>
      )}

      {/* Sales Popup Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full h-full max-w-[98vw] max-h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                 <div className="flex justify-between items-center p-2 px-4 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-primary-700 flex items-center gap-2">
                        <ShoppingCartIcon />
                        Bán Hàng
                    </h2>
                    <button onClick={() => setShowSalesModal(false)} className="text-gray-500 hover:text-red-500 text-2xl transition-colors">&times;</button>
                 </div>
                 <div className="flex-1 overflow-hidden bg-gray-100">
                    <SalesView 
                        products={products} 
                        customers={customers} 
                        onAddTransaction={addTransaction} 
                        onAddCustomer={customerOps.add} 
                    />
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;