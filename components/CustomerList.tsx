import React, { useState, useMemo } from 'react';
import { Customer, Transaction } from '../types';
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

  const handleOpenModal = (customer: Customer | null = null) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(false);
  };

  const calculateDebt = (customerId: string) => {
    const sales = transactions
      .filter(t => t.customerId === customerId && t.category.includes("Bán hàng"))
      .reduce((sum, t) => sum + t.amount, 0);
    const payments = transactions
      .filter(t => t.customerId === customerId && t.category.includes("Thu nợ"))
      .reduce((sum, t) => sum + t.amount, 0);
    return sales - payments;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleExport = () => {
    const headers = ["Tên Khách Hàng", "Phân Loại", "Mã Số Thuế", "Số Điện Thoại", "Địa Chỉ", "Ngân Hàng", "Số Tài Khoản", "Công Nợ"];
    const data = customers.map(c => [
      c.name,
      c.classification || '',
      c.taxId || '',
      c.phone || '',
      c.address || '',
      c.bankName || '',
      c.bankAccountNumber || '',
      calculateDebt(c.id)
    ]);
    exportToCsv('danh-sach-khach-hang', headers, data);
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700 mb-4 sm:mb-0">Danh Sách Khách Hàng</h2>
          <div className="flex items-center space-x-2">
            <button onClick={handleExport} className="flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:bg-green-700 transition-colors">
              <DownloadIcon />
              <span>Xuất Excel</span>
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg shadow hover:bg-primary-700 transition-colors">
              <PlusIcon />
              <span>Thêm Mới</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {customers.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân Loại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Số Thuế</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Điện Thoại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công Nợ</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map(customer => {
                  const debt = calculateDebt(customer.id);
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.taxId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(debt)}
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
              <p>Chưa có khách hàng nào.</p>
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