import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Customer, Supplier, Product } from '../types';
import { TrashIcon, DownloadIcon, FilterIcon } from '../constants';
import { exportToCsv } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, customers, suppliers, products }) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const customerMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Type filter (income/expense/all)
      if (typeFilter !== 'all' && (typeFilter === 'income' ? t.type !== TransactionType.INCOME : t.type !== TransactionType.EXPENSE)) {
        return false;
      }
      
      // Date range filter
      const tDate = new Date(t.date);
      if (startDate && new Date(tDate.toDateString()) < new Date(new Date(startDate).toDateString())) return false;
      if (endDate && new Date(tDate.toDateString()) > new Date(new Date(endDate).toDateString())) return false;
      
      // Product filter
      if (selectedProductId) {
        if (!t.lineItems || !t.lineItems.some(item => item.productId === selectedProductId)) {
          return false;
        }
      }

      // Amount range filter
      const parsedMin = parseFloat(minAmount);
      if (!isNaN(parsedMin) && t.amount < parsedMin) return false;
      const parsedMax = parseFloat(maxAmount);
      if (!isNaN(parsedMax) && t.amount > parsedMax) return false;

      return true;
    });
  }, [transactions, typeFilter, startDate, endDate, selectedProductId, minAmount, maxAmount]);

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedProductId('');
    setMinAmount('');
    setMaxAmount('');
    setTypeFilter('all');
  };

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
           <button onClick={() => setShowFilters(!showFilters)} className="flex items-center space-x-2 text-sm bg-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-300 transition-colors">
            <FilterIcon />
            <span>Bộ lọc</span>
          </button>
          <button onClick={handleExport} className="flex items-center space-x-2 text-sm bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:bg-green-700 transition-colors">
            <DownloadIcon />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 mb-6 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Từ ngày</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Đến ngày</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-gray-700">Sản phẩm</label>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
                <option value="">Tất cả sản phẩm</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
             <div>
              <label className="text-sm font-medium text-gray-700">Từ số tiền</label>
              <input type="number" placeholder="0" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
             <div>
              <label className="text-sm font-medium text-gray-700">Đến số tiền</label>
              <input type="number" placeholder="Không giới hạn" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
             <div className="lg:col-span-2 flex items-end">
              <button onClick={resetFilters} className="w-full text-sm bg-white text-gray-700 px-4 py-2 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100">Xóa bộ lọc</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-4">
         <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setTypeFilter('all')} className={`px-3 py-1 text-sm rounded-md ${typeFilter === 'all' ? 'bg-white text-primary-600 shadow' : 'text-gray-600'}`}>Tất cả</button>
            <button onClick={() => setTypeFilter('income')} className={`px-3 py-1 text-sm rounded-md ${typeFilter === 'income' ? 'bg-white text-green-600 shadow' : 'text-gray-600'}`}>Thu nhập</button>
            <button onClick={() => setTypeFilter('expense')} className={`px-3 py-1 text-sm rounded-md ${typeFilter === 'expense' ? 'bg-white text-red-600 shadow' : 'text-gray-600'}`}>Chi phí</button>
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
                                {(t.discountAmount ?? 0) > 0 && <span className="text-red-600 font-medium"> • Giảm: {formatCurrency(t.discountAmount!)}</span>}
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
            <p>Không có giao dịch nào khớp với bộ lọc.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;