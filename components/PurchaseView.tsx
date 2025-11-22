
import React, { useState, useMemo } from 'react';
import { Product, Supplier, Transaction } from '../types';
import { ArchiveBoxArrowDownIcon, PlusIcon } from '../constants';
import OCRPurchaseModal from './OCRPurchaseModal';
import PurchaseOrderModal from './PurchaseOrderModal';
import { formatCurrency, formatDate } from '../utils';

interface PurchaseViewProps {
  products: Product[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>, callback?: (newSupplier: Supplier) => void) => void;
  onAddProduct: (product: Omit<Product, 'id'>, callback?: (newProduct: Product) => void) => void;
  onUpdateProduct: (product: Product) => void;
}

const PurchaseView: React.FC<PurchaseViewProps> = ({ 
    products, 
    suppliers, 
    transactions, 
    onAddTransaction, 
    onAddSupplier, 
    onAddProduct, 
    onUpdateProduct 
}) => {
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  const purchaseHistory = useMemo(() => {
    return transactions
        .filter(t => t.category === 'Nhập hàng' || t.category === 'Trả hàng cho nhà cung cấp')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const filteredHistory = useMemo(() => {
      if (!historySearchTerm) return purchaseHistory;
      const lowerTerm = historySearchTerm.toLowerCase();
      return purchaseHistory.filter(t => {
          const supplierName = suppliers.find(s => s.id === t.supplierId)?.name.toLowerCase() || '';
          return supplierName.includes(lowerTerm) || t.description.toLowerCase().includes(lowerTerm);
      });
  }, [purchaseHistory, historySearchTerm, suppliers]);

  const getProductGroups = (transaction: Transaction) => {
      if (!transaction.lineItems || transaction.lineItems.length === 0) return "---";
      
      const categories = new Set<string>();
      transaction.lineItems.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product && product.subCategory) {
              categories.add(product.subCategory);
          } else if (product) {
              categories.add("Khác");
          }
      });
      
      const catArray = Array.from(categories);
      if (catArray.length === 0) return "---";
      return catArray.join(", ");
  };

  const getSupplierName = (id: string) => {
      return suppliers.find(s => s.id === id)?.name || 'N/A';
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
                <ArchiveBoxArrowDownIcon />
                Danh Sách Phiếu Nhập Hàng
            </h2>
            <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                    onClick={() => setIsOCRModalOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Quét OCR</span>
                </button>
                <button 
                    onClick={() => setIsPurchaseModalOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg shadow hover:bg-primary-700 transition-colors"
                >
                    <PlusIcon />
                    <span>Tạo Phiếu Nhập</span>
                </button>
            </div>
        </div>

        <div className="mb-4">
            <input 
                type="text" 
                placeholder="Tìm kiếm theo nhà cung cấp..." 
                value={historySearchTerm}
                onChange={e => setHistorySearchTerm(e.target.value)}
                className="w-full sm:w-1/3 p-2 border border-gray-300 rounded-lg"
            />
        </div>

        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nhập</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhà phân phối</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm phụ</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng số tiền</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistory.length > 0 ? filteredHistory.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-700">{t.supplierId ? getSupplierName(t.supplierId) : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getProductGroups(t)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right">{formatCurrency(t.amount)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="text-center py-12 text-gray-500">Chưa có phiếu nhập hàng nào.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
            {isOCRModalOpen && (
            <OCRPurchaseModal 
                onClose={() => setIsOCRModalOpen(false)}
                onAddTransaction={onAddTransaction}
                onAddProduct={onAddProduct}
                onUpdateProduct={onUpdateProduct}
                onAddSupplier={onAddSupplier}
                products={products}
                suppliers={suppliers}
                transactions={transactions}
            />
        )}
        {isPurchaseModalOpen && (
            <PurchaseOrderModal 
                onClose={() => setIsPurchaseModalOpen(false)}
                products={products}
                suppliers={suppliers}
                transactions={transactions}
                onAddTransaction={onAddTransaction}
                onAddSupplier={onAddSupplier}
                onUpdateProduct={onUpdateProduct}
            />
        )}
    </div>
  );
};

export default PurchaseView;
