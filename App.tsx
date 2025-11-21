
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Customer, Product, Supplier, Employee, UserRole, BusinessDetails } from './types';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import CustomerList from './components/CustomerList';
import ProductList from './components/ProductList';
import SupplierList from './components/SupplierList';
import SalesView from './components/SalesView';
import PurchaseView from './components/PurchaseView'; // New
import EmployeeList from './components/EmployeeList'; // New
import ReportsView from './components/ReportsView';
import LedgerView from './components/LedgerView';
import AddTransactionModal from './components/AddTransactionModal';
import { PlusIcon, ChartIcon, ListIcon, UsersIcon, CubeIcon, TruckIcon, ShoppingCartIcon, DocumentReportIcon, BookOpenIcon, IdentificationIcon, ArchiveBoxArrowDownIcon } from './constants';

type View = 'dashboard' | 'transactions' | 'customers' | 'products' | 'suppliers' | 'sales' | 'purchase' | 'reports' | 'ledger' | 'employees';

const initialBusinessDetails: BusinessDetails = {
    taxpayerName: 'Hoàng Văn Phan',
    storeName: 'HTP STORE',
    bankAccount: '9385372863',
    taxId: '022090004221',
    businessLines: [
      { code: '82191', name: 'Photo, chuẩn bị tài liệu' },
      { code: '47420', name: 'Bán lẻ thiết bị nghe nhìn trong các cửa hàng chuyên doanh' },
      { code: '47591', name: 'Bán lẻ đồ điện gia dụng, đèn và bộ đèn điện trong các cửa hàng chuyên doanh' },
      { code: '47610', name: 'Bán lẻ sách, báo, tạp chí văn phòng phẩm trong các cửa hàng chuyên doanh' },
      { code: '47411', name: 'Bán lẻ máy vi tính, thiết bị ngoại vi, phần mềm trong các cửa hàng chuyên doanh' },
      { code: '62020', name: 'Tư vấn máy vi tính và quản trị hệ thống máy vi tính' },
      { code: '62090', name: 'Hoạt động dịch vụ công nghệ thông tin và dịch vụ khác liên quan đến máy vi tính' },
      { code: '63120', name: 'Cổng thông tin' },
      { code: '95110', name: 'Sửa chữa máy vi tính và thiết bị ngoại vi' },
      { code: '18120', name: 'Dịch vụ liên quan đến in' },
    ],
    address: 'Thôn Đồng Giàng B, Xã Lương Minh, Huyện Ba Chẽ, Tỉnh Quảng Ninh',
    phone: '0385372863',
    email: 'contact.htpgroup@gmail.com',
};


const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(initialBusinessDetails);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

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
      const admin: Employee = { id: crypto.randomUUID(), name: 'Admin', role: UserRole.ADMIN };
      setEmployees([admin]);
      setCurrentUser(admin);
    } else if (!currentUser) {
      // Auto-login first user (or admin if available)
      setCurrentUser(employees.find(e => e.role === UserRole.ADMIN) || employees[0]);
    }
  }, [employees]);


  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: crypto.randomUUID() };
    setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  
  const updateTransaction = (updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const crudOperations = <T extends {id: string}>(state: T[], setState: React.Dispatch<React.SetStateAction<T[]>>) => ({
    add: (item: Omit<T, 'id'>, callback?: (newItem: T) => void) => {
      const newItem = { ...item, id: crypto.randomUUID() } as T;
      setState(prev => [...prev, newItem]);
      if (callback) {
        callback(newItem);
      }
    },
    batchAdd: (items: Omit<T, 'id'>[]) => {
      const newItems = items.map(item => ({ ...item, id: crypto.randomUUID() })) as T[];
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


  const NavItem = ({ view, label, icon, mobile = false }: { view: View, label: string, icon: React.ReactElement, mobile?: boolean }) => {
    if (!hasPermission(view)) return null;
    
    const isActive = activeView === view;
    if (mobile) {
         return (
             <button
              onClick={() => setActiveView(view)}
              className={`flex flex-col items-center justify-center w-full rounded-md py-2 px-1 text-xs font-medium transition-colors ${isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {icon}
              <span className="truncate">{label}</span>
            </button>
         )
    }
    return (
        <button
            onClick={() => setActiveView(view)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-primary-100 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
        >
            {icon}
            <span className="text-sm">{label}</span>
        </button>
    );
  };
  
  const UserSelector = () => (
    <div className="mt-auto pt-4 border-t border-gray-200">
        <label htmlFor="user-select" className="block text-xs text-gray-500 mb-1">Người dùng</label>
        <select
            id="user-select"
            value={currentUser?.id || ''}
            onChange={(e) => setCurrentUser(employees.find(emp => emp.id === e.target.value) || null)}
            className="w-full p-2 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        >
            {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                </option>
            ))}
        </select>
         <button
            onClick={() => setCurrentUser(null)}
            className="w-full mt-2 text-sm text-center text-gray-500 hover:text-primary-600"
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
      case 'sales': return <SalesView products={products} customers={customers} onAddTransaction={addTransaction} onAddCustomer={customerOps.add} />;
      case 'purchase': return <PurchaseView products={products} suppliers={suppliers} onAddTransaction={addTransaction} onAddSupplier={supplierOps.add} />;
      case 'customers': return <CustomerList customers={customers} transactions={transactions} onAdd={customerOps.add} onUpdate={customerOps.update} onDelete={customerOps.delete} />;
      case 'products': return <ProductList products={products} onAdd={productOps.add} onUpdate={productOps.update} onDelete={productOps.delete} onBatchAdd={productOps.batchAdd} transactions={transactions} suppliers={suppliers} />;
      case 'suppliers': return <SupplierList suppliers={suppliers} transactions={transactions} onAdd={supplierOps.add} onUpdate={supplierOps.update} onDelete={supplierOps.delete} />;
      case 'reports': return <ReportsView transactions={transactions} customers={customers} suppliers={suppliers} products={products} currentUser={currentUser}/>;
      case 'ledger': return <LedgerView transactions={transactions} products={products} customers={customers} suppliers={suppliers} onAddTransaction={addTransaction} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} onAddProduct={productOps.add} />;
      case 'employees': return <EmployeeList employees={employees} onAdd={employeeOps.add} onUpdate={employeeOps.update} onDelete={employeeOps.delete} />;
      default: return <Dashboard transactions={transactions} customers={customers} suppliers={suppliers} currentUser={currentUser} businessDetails={businessDetails} onUpdateBusinessDetails={setBusinessDetails} />;
    }
  }
  
  if (!currentUser) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-lg">
                <h1 className="text-2xl font-bold text-center text-primary-700 mb-6">Đăng Nhập</h1>
                <p className="text-center text-gray-600 mb-4">Vui lòng chọn tài khoản của bạn</p>
                <div className="space-y-3">
                    {employees.map(emp => (
                        <button
                            key={emp.id}
                            onClick={() => setCurrentUser(emp)}
                            className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-primary-100 border border-gray-200 hover:border-primary-300 transition-colors"
                        >
                            <p className="font-semibold text-gray-800">{emp.name}</p>
                            <p className="text-sm text-primary-600">{emp.role}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800 flex">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 p-4 space-y-2 fixed h-full">
            <div className="px-2 mb-4">
                 <h1 className="text-lg font-bold text-primary-700">Sổ Sách Kế Toán</h1>
            </div>
            <NavItem view="dashboard" label="Tổng Quan" icon={<ChartIcon />} />
            <NavItem view="sales" label="Bán Hàng" icon={<ShoppingCartIcon />} />
            <NavItem view="purchase" label="Nhập Hàng" icon={<ArchiveBoxArrowDownIcon />} />
            <NavItem view="transactions" label="Giao Dịch" icon={<ListIcon />} />
            <NavItem view="customers" label="Khách Hàng" icon={<UsersIcon />} />
            <NavItem view="suppliers" label="Nhà Cung Cấp" icon={<TruckIcon />} />
            <NavItem view="products" label="Hàng Hóa" icon={<CubeIcon />} />
            <NavItem view="ledger" label="Sổ Sách" icon={<BookOpenIcon />} />
            <NavItem view="reports" label="Báo Cáo" icon={<DocumentReportIcon />} />
            <NavItem view="employees" label="Nhân Viên" icon={<IdentificationIcon />} />
             
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ACCOUNTANT) && (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full mt-4 flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-3 rounded-lg shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105"
                    aria-label="Thêm giao dịch mới"
                >
                    <PlusIcon />
                    <span className="text-sm font-semibold">Giao Dịch Nhanh</span>
                </button>
            )}

            <UserSelector />
        </aside>

        <div className="flex-1 md:ml-64">
            <header className="bg-white shadow-sm sticky top-0 z-10 md:hidden p-4 flex justify-between items-center">
                 <h1 className="text-xl sm:text-2xl font-bold text-primary-700">Sổ Sách Kế Toán</h1>
                 <div className="w-40">
                     <select
                        id="user-select-mobile"
                        value={currentUser?.id || ''}
                        onChange={(e) => setCurrentUser(employees.find(emp => emp.id === e.target.value) || null)}
                        className="w-full p-2 text-xs border-gray-300 rounded-md shadow-sm"
                    >
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.role})
                            </option>
                        ))}
                    </select>
                 </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
                {renderContent()}
            </main>
        </div>
      
      {/* Bottom Nav for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 grid grid-cols-5 gap-1 p-1 z-20 md:hidden">
        <NavItem view="dashboard" label="Tổng quan" icon={<ChartIcon />} mobile />
        <NavItem view="sales" label="Bán Hàng" icon={<ShoppingCartIcon />} mobile />
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
    </div>
  );
};

export default App;
