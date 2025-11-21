
import React, { useMemo } from 'react';
import { Transaction, TransactionType, Customer, Supplier, Employee, UserRole, BusinessDetails } from '../types';
import StatCard from './StatCard';
import SummaryChart from './SummaryChart';
import BusinessInfo from './BusinessInfo';

interface DashboardProps {
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  currentUser: Employee;
  businessDetails: BusinessDetails;
  onUpdateBusinessDetails: (details: BusinessDetails) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, customers, suppliers, currentUser, businessDetails, onUpdateBusinessDetails }) => {
  const { totalIncome, totalExpense, balance, totalReceivable, totalPayable } = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
      if (t.type === TransactionType.INCOME) totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    let totalReceivable = 0;
    customers.forEach(c => {
        const sales = transactions
            .filter(t => t.customerId === c.id && t.category === "Bán hàng")
            .reduce((sum, t) => sum + t.amount, 0);
        const payments = transactions
            .filter(t => t.customerId === c.id && t.category === "Thu nợ khách hàng")
            .reduce((sum, t) => sum + t.amount, 0);
        totalReceivable += (sales - payments);
    });

    let totalPayable = 0;
    suppliers.forEach(s => {
        const purchases = transactions
            .filter(t => t.supplierId === s.id && t.category !== "Trả nợ nhà cung cấp")
            .reduce((sum, t) => sum + t.amount, 0);
        const payments = transactions
            .filter(t => t.supplierId === s.id && t.category === "Trả nợ nhà cung cấp")
            .reduce((sum, t) => sum + t.amount, 0);
        totalPayable += (purchases - payments);
    });
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      totalReceivable,
      totalPayable
    };
  }, [transactions, customers, suppliers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  
  const canViewFinancials = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ACCOUNTANT;

  return (
    <div className="space-y-8">
      <BusinessInfo details={businessDetails} onUpdate={onUpdateBusinessDetails} />
      <div>
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Tổng Quan Tài Chính</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {canViewFinancials && <StatCard title="Tổng Thu Nhập" value={formatCurrency(totalIncome)} color="text-green-500" />}
          {canViewFinancials && <StatCard title="Tổng Chi Phí" value={formatCurrency(totalExpense)} color="text-red-500" />}
          {canViewFinancials && <StatCard title="Lợi Nhuận" value={formatCurrency(balance)} color={balance >= 0 ? 'text-blue-500' : 'text-red-500'} />}
          <StatCard title="Nợ Phải Thu" value={formatCurrency(totalReceivable)} color="text-yellow-600" />
          <StatCard title="Nợ Phải Trả" value={formatCurrency(totalPayable)} color="text-purple-600" />
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
         <h3 className="text-lg font-semibold text-gray-800 mb-4">Biểu Đồ Thu - Chi</h3>
         <div className="h-80">
            {canViewFinancials ? (
                <SummaryChart transactions={transactions} />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    Bạn không có quyền xem dữ liệu này.
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
