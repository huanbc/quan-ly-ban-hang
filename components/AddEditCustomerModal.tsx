import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

interface Props {
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'> | Customer) => void;
  customer: Customer | null;
}

const AddEditCustomerModal: React.FC<Props> = ({ onClose, onSave, customer }) => {
  const [name, setName] = useState('');
  const [classification, setClassification] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [budgetCode, setBudgetCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setClassification(customer.classification || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setTaxId(customer.taxId || '');
      setBudgetCode(customer.budgetCode || '');
      setBankName(customer.bankName || '');
      setBankAccountNumber(customer.bankAccountNumber || '');
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Tên khách hàng là bắt buộc.');
      return;
    }
    const customerData = { 
      name, 
      classification,
      phone, 
      address,
      taxId,
      budgetCode,
      bankName,
      bankAccountNumber
    };
    if (customer) {
      onSave({ ...customer, ...customerData });
    } else {
      onSave(customerData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {customer ? 'Chỉnh Sửa Khách Hàng' : 'Thêm Khách Hàng Mới'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên khách hàng</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
               <div>
                <label htmlFor="classification" className="block text-sm font-medium text-gray-700">Phân loại khách hàng</label>
                <input type="text" id="classification" value={classification} onChange={e => setClassification(e.target.value)} placeholder="VD: Bán lẻ, Bán buôn, VIP" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">Mã số thuế</label>
                  <input type="text" id="taxId" value={taxId} onChange={e => setTaxId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
                </div>
                <div>
                  <label htmlFor="budgetCode" className="block text-sm font-medium text-gray-700">Mã QHNS</label>
                  <input type="text" id="budgetCode" value={budgetCode} onChange={e => setBudgetCode(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                <input type="text" id="address" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Ngân hàng</label>
                  <input type="text" id="bankName" value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
                </div>
                 <div>
                  <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700">Số tài khoản</label>
                  <input type="text" id="bankAccountNumber" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
                </div>
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

export default AddEditCustomerModal;