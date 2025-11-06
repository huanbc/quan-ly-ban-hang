import React, { useState, useEffect } from 'react';
import { Product, TaxCategory } from '../types';

interface Props {
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'> | Product) => void;
  product: Product | null;
}

const AddEditProductModal: React.FC<Props> = ({ onClose, onSave, product }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [unit, setUnit] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [vat, setVat] = useState('');
  const [taxCategory, setTaxCategory] = useState<TaxCategory | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku || '');
      setPrice(String(product.price));
      setPurchasePrice(String(product.purchasePrice));
      setInitialStock(String(product.initialStock));
      setUnit(product.unit);
      setSubCategory(product.subCategory || '');
      setVat(product.vat ? String(product.vat) : '');
      setTaxCategory(product.taxCategory || '');
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    const parsedPurchasePrice = parseFloat(purchasePrice);
    const parsedInitialStock = parseFloat(initialStock);
    const parsedVat = vat ? parseFloat(vat) : 0;

    if (!name || !unit || !price || !purchasePrice || !initialStock) {
        setError('Vui lòng điền đầy đủ tất cả các trường bắt buộc.');
        return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0 || isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0 || isNaN(parsedInitialStock) || parsedInitialStock < 0 || isNaN(parsedVat) || parsedVat < 0) {
      setError('Các giá trị số không hợp lệ.');
      return;
    }
    const productData = { 
        name, 
        sku,
        price: parsedPrice,
        purchasePrice: parsedPurchasePrice,
        initialStock: parsedInitialStock,
        unit, 
        subCategory,
        vat: parsedVat,
        taxCategory: taxCategory || undefined 
    };
    if (product) {
      onSave({ ...product, ...productData });
    } else {
      onSave(productData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {product ? 'Chỉnh Sửa Hàng Hóa' : 'Thêm Hàng Hóa Mới'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên hàng hóa</label>
                  <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                 <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700">Mã sản phẩm (SKU)</label>
                  <input type="text" id="sku" value={sku} onChange={e => setSku(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Giá nhập (VND)</label>
                    <input type="number" id="purchasePrice" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">Giá bán (VND)</label>
                    <input type="number" id="price" value={price} onChange={e => setPrice(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="initialStock" className="block text-sm font-medium text-gray-700">Tồn kho ban đầu</label>
                    <input type="number" id="initialStock" value={initialStock} onChange={e => setInitialStock(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Đơn vị</label>
                    <input type="text" id="unit" value={unit} onChange={e => setUnit(e.target.value)} placeholder="VD: cái, kg, thùng" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700">Nhóm phụ</label>
                  <input type="text" id="subCategory" value={subCategory} onChange={e => setSubCategory(e.target.value)} placeholder="VD: Linh kiện máy tính" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                  <label htmlFor="vat" className="block text-sm font-medium text-gray-700">VAT (%)</label>
                  <input type="number" id="vat" value={vat} onChange={e => setVat(e.target.value)} placeholder="VD: 8 hoặc 10" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"/>
                </div>
              </div>

               <div>
                <label htmlFor="taxCategory" className="block text-sm font-medium text-gray-700">Nhóm ngành nghề tính thuế</label>
                <select id="taxCategory" value={taxCategory} onChange={e => setTaxCategory(e.target.value as TaxCategory)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
                  <option value="">-- Chọn nhóm ngành nghề --</option>
                  {Object.values(TaxCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
             {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditProductModal;