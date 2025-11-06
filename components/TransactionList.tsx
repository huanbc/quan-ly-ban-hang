import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Customer, Supplier } from '../types';
import { TrashIcon, DownloadIcon } from '../constants';
import { exportToCsv } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  customers: Customer[];
  suppliers: Supplier[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, customers, suppliers }) => {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return filter === 'income' ? t.type === TransactionType.INCOME : t.type === TransactionType.EXPENSE;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(correctedDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getPartyName = (transaction: Transaction): string | null => {
    if (transaction.customerId && customerMap.has(transaction.customerId)) {
      return `KH: ${customerMap.get(transaction.customerId)}`;
    }
    if (transaction.supplierId && supplierMap.has(transaction.supplierId)) {
      return `NCC: ${supplierMap.get(transaction.supplierId)}`;
    }
    return null;
  }
  
  const handleExport = () => {
    const headers = ["Ngày", "Mô tả", "Danh mục", "Số tiền", "Loại", "Đối tượng"];
    const data = filteredTransactions.map(t => [
      formatDate(t.date),
      t.description,
      t.category,
      t.amount,
      t.type === TransactionType.INCOME ? 'Thu nhập' : 'Chi phí',
      getPartyName(t) || ''
    ]);
    exportToCsv('danh-sach-giao-dich', headers, data);
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-700 mb-4 sm:mb-0">Lịch Sử Giao Dịch</h2>
        <div className="flex items-center space-x-2">
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm rounded-md ${filter === 'all' ? 'bg-white text-primary-600 shadow' : 'text-gray-600'}`}>Tất cả</button>
            <button onClick={() => setFilter('income')} className={`px-3 py-1 text-sm rounded-md ${filter === 'income' ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>Thu nhập</button>
            <button onClick={() => setFilter('expense')} className={`px-3 py-1 text-sm rounded-md ${filter === 'expense' ? 'bg-white text-red-600 shadow' : 'text-gray-600'}`}>Chi phí</button>
          </div>
          <button onClick={handleExport} className="flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:bg-green-700 transition-colors">
            <DownloadIcon />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        {filteredTransactions.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredTransactions.map(t => {
                const partyName = getPartyName(t);
                return (
                  <li key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                       <div className={`w-3 h-10 rounded-full ${t.type === TransactionType.INCOME ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <div>
                            <p className="font-semibold text-gray-800">{t.description}</p>
                            <p className="text-sm text-gray-500">
                                {t.category} • {formatDate(t.date)}
                                {partyName && <span className="text-blue-600 font-medium"> • {partyName}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <p className={`font-semibold text-right ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                        </p>
                        <button 
                          onClick={() => onDelete(t.id)} 
                          className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-100"
                          aria-label="Xóa giao dịch"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                  </li>
                )
            })}
          </ul>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Không có giao dịch nào.</p>
            <p className="text-sm">Hãy nhấn nút `+` để thêm giao dịch đầu tiên.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;