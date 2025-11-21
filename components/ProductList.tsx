import React, { useState, useRef, useMemo } from 'react';
import { Product, TaxCategory, Transaction, Supplier } from '../types';
import { PlusIcon, DownloadIcon } from '../constants';
import AddEditProductModal from './AddEditProductModal';
import { exportToCsv } from '../utils';

interface Props {
  products: Product[];
  transactions: Transaction[];
  suppliers: Supplier[];
  onAdd: (product: Omit<Product, 'id'>) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onBatchAdd: (products: Omit<Product, 'id'>[]) => void;
}

const ProductList: React.FC<Props> = ({ products, transactions, suppliers, onAdd, onUpdate, onDelete, onBatchAdd }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

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

  const productCategories = useMemo(() => {
    const categories = new Set(products.map(p => p.subCategory).filter((c): c is string => !!c));
    return Array.from(categories).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const supplierProductIds = selectedSupplierId
        ? new Set(
            transactions
                .filter(t => t.supplierId === selectedSupplierId && t.lineItems)
                .flatMap(t => t.lineItems!.map(item => item.productId))
          )
        : null;

    return products.filter(product => {
        const nameMatch = !searchTerm || product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = !selectedCategory || product.subCategory === selectedCategory;
        const supplierMatch = !supplierProductIds || supplierProductIds.has(product.id);

        return nameMatch && categoryMatch && supplierMatch;
    });
  }, [products, searchTerm, selectedCategory, selectedSupplierId, transactions]);


  const headers = ["Mã SP", "Tên Hàng Hóa", "Nhóm Phụ", "Giá Nhập", "Giá Bán", "VAT (%)", "Đơn Vị", "Tồn Kho Đầu", "Nhóm Ngành Nghề Thuế"];

  const handleExport = () => {
    const data = filteredProducts.map(p => [
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
  
  const handleDownloadTemplate = () => {
    const exampleData = [
      ["SP001", "Bàn phím cơ", "Phụ kiện", "500000", "750000", "8", "cái", "50", TaxCategory.DISTRIBUTION_GOODS]
    ];
    exportToCsv('mau-nhap-hang-hoa', headers, exampleData);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const newProducts = parseCsv(text);
        if (newProducts.length > 0) {
          onBatchAdd(newProducts);
          setImportMessage({ type: 'success', text: `Đã nhập thành công ${newProducts.length} sản phẩm.` });
        } else {
           setImportMessage({ type: 'error', text: 'File không có dữ liệu hợp lệ.' });
        }
      } catch (error: any) {
        setImportMessage({ type: 'error', text: `Lỗi: ${error.message}` });
      } finally {
         if (fileInputRef.current) {
             fileInputRef.current.value = "";
         }
      }
    };
    reader.onerror = () => {
        setImportMessage({ type: 'error', text: 'Không thể đọc file.' });
    }
    reader.readAsText(file, 'UTF-8');
  };

  const parseCsv = (csvText: string): Omit<Product, 'id'>[] => {
    const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      throw new Error("File CSV phải có ít nhất một dòng tiêu đề và một dòng dữ liệu.");
    }
    
    const headerLine = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    if (JSON.stringify(headerLine) !== JSON.stringify(headers)) {
        throw new Error(`Cấu trúc cột không đúng. Vui lòng sử dụng file mẫu.`);
    }

    const productsToAdd: Omit<Product, 'id'>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length !== headers.length) {
            console.warn(`Bỏ qua dòng ${i+1}: số lượng cột không khớp.`);
            continue;
        }

        const productData: any = {};
        headers.forEach((header, index) => {
            productData[header] = values[index];
        });
        
        const purchasePrice = parseFloat(productData["Giá Nhập"]);
        const price = parseFloat(productData["Giá Bán"]);
        const initialStock = parseFloat(productData["Tồn Kho Đầu"]);
        const vat = productData["VAT (%)"] ? parseFloat(productData["VAT (%)"]) : 0;
        
        if (!productData["Tên Hàng Hóa"] || !productData["Đơn Vị"] || isNaN(purchasePrice) || isNaN(price) || isNaN(initialStock)) {
            console.warn(`Bỏ qua dòng ${i+1}: Dữ liệu bắt buộc (Tên, Đơn vị, Giá, Tồn kho) bị thiếu hoặc không hợp lệ.`);
            continue;
        }

        const taxCategoryValue = productData["Nhóm Ngành Nghề Thuế"];
        const isValidTaxCategory = Object.values(TaxCategory).includes(taxCategoryValue as TaxCategory);
        
        productsToAdd.push({
            sku: productData["Mã SP"] || '',
            name: productData["Tên Hàng Hóa"],
            subCategory: productData["Nhóm Phụ"] || '',
            purchasePrice: purchasePrice,
            price: price,
            vat: isNaN(vat) ? 0 : vat,
            unit: productData["Đơn Vị"],
            initialStock: initialStock,
            taxCategory: isValidTaxCategory ? taxCategoryValue as TaxCategory : undefined,
        });
    }
    return productsToAdd;
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <h2 className="text-2xl font-bold text-gray-700">Danh Sách Hàng Hóa</h2>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button onClick={handleDownloadTemplate} className="flex items-center space-x-2 text-sm bg-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow-sm hover:bg-gray-300 transition-colors">
                <DownloadIcon />
                <span>Tải mẫu</span>
            </button>
            <button onClick={handleImportClick} className="flex items-center space-x-2 text-sm bg-green-100 text-green-700 px-3 py-2 rounded-lg shadow-sm hover:bg-green-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span>Nhập Excel</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv"/>
            <button onClick={handleExport} className="flex items-center space-x-2 text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded-lg shadow-sm hover:bg-blue-200 transition-colors">
              <DownloadIcon />
              <span>Xuất Excel</span>
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg shadow hover:bg-primary-700 transition-colors">
              <PlusIcon />
              <span>Thêm Mới</span>
            </button>
          </div>
        </div>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
                type="text"
                placeholder="Tìm theo tên hàng hóa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-primary-500 focus:border-primary-500"
            >
                <option value="">Tất cả nhóm hàng</option>
                {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-primary-500 focus:border-primary-500"
            >
                <option value="">Tất cả nhà cung cấp</option>
                {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
            </select>
        </div>

        {importMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${importMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {importMessage.text}
          </div>
        )}

        <div className="overflow-x-auto">
          {filteredProducts.length > 0 ? (
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
                {filteredProducts.map(product => (
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
                <p>{(searchTerm || selectedCategory || selectedSupplierId) ? 'Không tìm thấy hàng hóa nào khớp với bộ lọc.' : 'Chưa có hàng hóa nào.'}</p>
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