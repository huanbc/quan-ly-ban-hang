import React, { useState, useMemo } from 'react';
import { Customer, Transaction, TransactionType } from '../types';
import { PlusIcon, DownloadIcon } from '../constants';
import AddEditCustomerModal from './AddEditCustomerModal';
import { exportToCsv } from '../utils';

interface CustomerListProps {
  customers: Customer[];
  transactions: Transaction[];
  onAdd: (customer: Omit<Customer, 'id'>) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (id: string) => void;
}

const CustomerList: React.FC<CustomerListProps> = ({ customers, transactions, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedFilter) ||
      (customer.phone && customer.phone.toLowerCase().includes(lowercasedFilter))
    );
  }, [customers, searchTerm]);


  const handleOpenModal = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(false);
  };

  const calculateDebtInfo = (customerId: string) => {
    const customerTransactions = transactions
        .filter(t => t.customerId === customerId && (t.category === "Bán hàng" || t.category === "Thu nợ khách hàng" || t.category === 'Khách trả hàng'))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    let debtStartDate: Date | null = null;

    for (const t of customerTransactions) {
        const previousBalance = balance;
        
        if (t.category === "Bán hàng") {
            balance += t.amount;
        } else if (t.category === "Thu nợ khách hàng" || t.category === 'Khách trả hàng') {
            balance -= t.amount;
        }

        if (previousBalance <= 0 && balance > 0) {
            debtStartDate = new Date(t.date);
        }
    }

    if (balance <= 0) {
        return { debt: 0, duration: null };
    }

    let duration: number | null = null;
    if (debtStartDate) {
        const today = new Date();
        const startDate = new Date(debtStartDate.getFullYear(), debtStartDate.getMonth(), debtStartDate.getDate());
        const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const timeDiff = endDate.getTime() - startDate.getTime();
        duration = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    return { debt: balance, duration };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleExport = () => {
    const headers = ["Tên Khách Hàng", "Phân Loại", "Mã Số Thuế", "Số Điện Thoại", "Địa Chỉ", "Ngân Hàng", "Số Tài Khoản", "Công Nợ", "Thời Gian Nợ (ngày)"];
    const data = filteredCustomers.map(c => {
        const { debt, duration } = calculateDebtInfo(c.id);
        return [
          c.name,
          c.classification || '',
          c.taxId || '',
          c.phone || '',
          c.address || '',
          c.bankName || '',
          c.bankAccountNumber || '',
          debt,
          duration !== null ? duration : ''
        ];
    });
    exportToCsv('danh-sach-khach-hang', headers, data);
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-700">Danh Sách Khách Hàng</h2>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
             <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <button onClick={handleExport} className="flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:bg-green-700 transition-colors">
              <DownloadIcon />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg shadow hover:bg-primary-700 transition-colors">
              <PlusIcon />
              <span className="hidden sm:inline">Thêm Mới</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredCustomers.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân Loại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Điện Thoại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công Nợ</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời Gian Nợ</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map(customer => {
                  const { debt, duration } = calculateDebtInfo(customer.id);
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.address}</div>
                        {customer.bankName && customer.bankAccountNumber && (
                           <div className="text-xs text-gray-400 mt-1">
                                {customer.bankName}: {customer.bankAccountNumber}
                           </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.classification}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(debt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {debt > 0 ? (duration !== null ? `${duration} ngày` : '-') : 'Không nợ'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => handleOpenModal(customer)} className="text-primary-600 hover:text-primary-900">Sửa</button>
                        <button onClick={() => onDelete(customer.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>{searchTerm ? 'Không tìm thấy khách hàng nào.' : 'Chưa có khách hàng nào.'}</p>
            </div>
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddEditCustomerModal
          onClose={handleCloseModal}
          onSave={editingCustomer ? onUpdate : onAdd}
          customer={editingCustomer}
        />
      )}
    </>
  );
};

export default CustomerList;