import React, { useState } from 'react';
import { Product } from '../types';
import { PlusIcon, DownloadIcon } from '../constants';
import AddEditProductModal from './AddEditProductModal';
import { exportToCsv } from '../utils';

interface Props {
  products: Product[];
  onAdd: (product: Omit<Product, 'id'>) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
}

const ProductList: React.FC<Props> = ({ products, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleOpenModal = (product: Product | null = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setEditingProduct(null);
    setIsModalOpen(false);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleExport = () => {
    const headers = ["Mã SP", "Tên Hàng Hóa", "Nhóm Phụ", "Giá Nhập", "Giá Bán", "VAT (%)", "Đơn Vị", "Tồn Kho Đầu", "Nhóm Ngành Nghề Thuế"];
    const data = products.map(p => [
        p.sku || '',
        p.name, 
        p.subCategory || '',
        p.purchasePrice, 
        p.price, 
        p.vat || 0,
        p.unit, 
        p.initialStock, 
        p.taxCategory || ''
    ]);
    exportToCsv('danh-sach-hang-hoa', headers, data);
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700 mb-4 sm:mb-0">Danh Sách Hàng Hóa</h2>
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
          {products.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Hàng Hóa / Mã SP</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhóm Phụ</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá Nhập</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá Bán</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn Vị</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.sku || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.subCategory || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(product.purchasePrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.vat ? `${product.vat}%` : '0%'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleOpenModal(product)} className="text-primary-600 hover:text-primary-900">Sửa</button>
                      <button onClick={() => onDelete(product.id)} className="text-red-600 hover:text-red-900">Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div className="text-center py-12 text-gray-500">
              <p>Chưa có hàng hóa nào.</p>
            </div>
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddEditProductModal
          onClose={handleCloseModal}
          onSave={editingProduct ? onUpdate : onAdd}
          product={editingProduct}
        />
      )}
    </>
  );
};

export default ProductList;