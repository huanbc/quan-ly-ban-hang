import React, { useState, useMemo } from 'react';
import { Supplier, Transaction } from '../types';
import { PlusIcon, DownloadIcon } from '../constants';
import AddEditSupplierModal from './AddEditSupplierModal';
import { exportToCsv } from '../utils';

interface Props {
  suppliers: Supplier[];
  transactions: Transaction[];
  onAdd: (supplier: Omit<Supplier, 'id'>) => void;
  onUpdate: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

const SupplierList: React.FC<Props> = ({ suppliers, transactions, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) {
      return suppliers;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(lowercasedFilter) ||
      (supplier.phone && supplier.phone.toLowerCase().includes(lowercasedFilter))
    );
  }, [suppliers, searchTerm]);

  const handleOpenModal = (supplier: Supplier | null = null) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setEditingSupplier(null);
    setIsModalOpen(false);
  };
  
  const calculateDebt = (supplierId: string) => {
    const purchases = transactions
      .filter(t => t.supplierId === supplierId && t.category !== "Trả nợ nhà cung cấp")
      .reduce((sum, t) => sum + t.amount, 0);
    const payments = transactions
      .filter(t => t.supplierId === supplierId && t.category === "Trả nợ nhà cung cấp")
      .reduce((sum, t) => sum + t.amount, 0);
    return purchases - payments;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleExport = () => {
    const headers = ["Tên Nhà Cung Cấp", "Phân Loại", "Mã Số Thuế", "Số Điện Thoại", "Địa Chỉ", "Ngân Hàng", "Số Tài Khoản", "Công Nợ"];
    const data = filteredSuppliers.map(s => [
      s.name,
      s.classification || '',
      s.taxId || '',
      s.phone || '',
      s.address || '',
      s.bankName || '',
      s.bankAccountNumber || '',
      calculateDebt(s.id)
    ]);
    exportToCsv('danh-sach-nha-cung-cap', headers, data);
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-700">Danh Sách Nhà Cung Cấp</h2>
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
          {filteredSuppliers.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Nhà Cung Cấp</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phân Loại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Số Thuế</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số Điện Thoại</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Công Nợ</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.map(supplier => {
                  const debt = calculateDebt(supplier.id);
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        <div className="text-sm text-gray-500">{supplier.address}</div>
                        {supplier.bankName && supplier.bankAccountNumber && (
                           <div className="text-xs text-gray-400 mt-1">
                                {supplier.bankName}: {supplier.bankAccountNumber}
                           </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.classification}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.taxId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{supplier.phone}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${debt > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                        {formatCurrency(debt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                         <button onClick={() => handleOpenModal(supplier)} className="text-primary-600 hover:text-primary-900">Sửa</button>
                        <button onClick={() => onDelete(supplier.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>{searchTerm ? 'Không tìm thấy nhà cung cấp nào.' : 'Chưa có nhà cung cấp nào.'}</p>
            </div>
          )}
        </div>
      </div>
       {isModalOpen && (
        <AddEditSupplierModal
          onClose={handleCloseModal}
          onSave={editingSupplier ? onUpdate : onAdd}
          supplier={editingSupplier}
        />
      )}
    </>
  );
};

export default SupplierList;