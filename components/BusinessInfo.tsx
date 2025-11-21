import React, { useState, useEffect } from 'react';
import { BusinessDetails } from '../types';
import { businessCodes } from '../data/businessCodes';
import { TrashIcon } from '../constants';

interface BusinessInfoProps {
    details: BusinessDetails;
    onUpdate: (details: BusinessDetails) => void;
}

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const BusinessInfo: React.FC<BusinessInfoProps> = ({ details, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(details);

  useEffect(() => {
    setFormData(details);
  }, [details]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleBusinessLineChange = (index: number, field: 'code' | 'name', value: string) => {
    const newBusinessLines = [...formData.businessLines];
    const currentLine = { ...newBusinessLines[index] };
    currentLine[field] = value;
    
    // Two-way binding logic
    if (field === 'code') {
      const match = businessCodes.find(bc => bc.code === value);
      if (match) {
        currentLine.name = match.name;
      }
    } else if (field === 'name') {
      const match = businessCodes.find(bc => bc.name === value);
      if (match) {
        currentLine.code = match.code;
      }
    }
    
    newBusinessLines[index] = currentLine;
    setFormData(prev => ({ ...prev, businessLines: newBusinessLines }));
  };

  const addBusinessLine = () => {
    setFormData(prev => ({
      ...prev,
      businessLines: [...prev.businessLines, { code: '', name: '' }]
    }));
  };
  
  const removeBusinessLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      businessLines: prev.businessLines.filter((_, i) => i !== index)
    }));
  };


  const handleSave = () => {
    const cleanedData = {
        ...formData,
        businessLines: formData.businessLines.filter(line => line.code.trim() && line.name.trim())
    };
    onUpdate(cleanedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(details);
  };

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col sm:flex-row py-1">
      <p className="w-full sm:w-1/3 font-semibold text-gray-600">{label}:</p>
      <p className="w-full sm:w-2/3 text-gray-800">{value}</p>
    </div>
  );

  const EditItem = ({ label, name, value }: { label: string; name: string; value: string; }) => (
    <div className="flex flex-col sm:flex-row py-1 items-start">
        <label htmlFor={name} className="w-full sm:w-1/3 font-semibold text-gray-600 pt-2">{label}:</label>
        <input
            type='text'
            id={name}
            name={name}
            value={value}
            onChange={handleInputChange}
            className="w-full sm:w-2/3 px-3 py-2 text-gray-800 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
        />
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-2xl font-bold text-gray-700">Thông Tin Hộ Kinh Doanh</h2>
        {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="flex items-center space-x-2 text-sm bg-primary-100 text-primary-700 px-3 py-2 rounded-lg shadow-sm hover:bg-primary-200 transition-colors">
                <EditIcon />
                <span>Chỉnh Sửa</span>
            </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-3 text-sm">
            <EditItem label="Tên người nộp thuế" name="taxpayerName" value={formData.taxpayerName} />
            <EditItem label="Tên cửa hàng" name="storeName" value={formData.storeName} />
            <EditItem label="Mã số thuế" name="taxId" value={formData.taxId} />
            <EditItem label="Tài khoản ngân hàng" name="bankAccount" value={formData.bankAccount} />
            <EditItem label="Địa chỉ kinh doanh" name="address" value={formData.address} />
            <EditItem label="Điện thoại" name="phone" value={formData.phone} />
            <EditItem label="Email" name="email" value={formData.email} />
            
             <div className="space-y-2 pt-2">
                <label className="w-full font-semibold text-gray-600">Ngành nghề kinh doanh:</label>
                <datalist id="business-names">
                    {businessCodes.map(bc => <option key={bc.code} value={bc.name} />)}
                </datalist>
                {formData.businessLines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2 pl-4">
                    <input
                        type="text"
                        placeholder="Mã ngành"
                        value={line.code}
                        onChange={(e) => handleBusinessLineChange(index, 'code', e.target.value)}
                        className="w-24 px-3 py-2 text-gray-800 border border-gray-300 rounded-md shadow-sm"
                    />
                    <input
                        type="text"
                        placeholder="Tên ngành nghề"
                        value={line.name}
                        onChange={(e) => handleBusinessLineChange(index, 'name', e.target.value)}
                        list="business-names"
                        className="flex-1 px-3 py-2 text-gray-800 border border-gray-300 rounded-md shadow-sm"
                    />
                    <button type="button" onClick={() => removeBusinessLine(index)} className="text-red-500 p-2 rounded-full hover:bg-red-100">
                        <TrashIcon />
                    </button>
                    </div>
                ))}
                <button type="button" onClick={addBusinessLine} className="text-sm text-primary-600 font-semibold hover:text-primary-800 mt-2 ml-4">
                    + Thêm ngành nghề
                </button>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button onClick={handleCancel} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                <button onClick={handleSave} className="px-4 py-2 bg-primary-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700">Lưu thay đổi</button>
            </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
            <InfoItem label="Tên người nộp thuế" value={details.taxpayerName} />
            <InfoItem label="Tên cửa hàng" value={details.storeName} />
            <InfoItem label="Mã số thuế" value={details.taxId} />
            <InfoItem label="Tài khoản ngân hàng" value={details.bankAccount} />
            <InfoItem label="Địa chỉ kinh doanh" value={details.address} />
            <InfoItem label="Điện thoại" value={details.phone} />
            <InfoItem label="Email" value={details.email} />
            <div className="flex flex-col sm:flex-row py-1">
                <p className="w-full sm:w-1/3 font-semibold text-gray-600 pt-1">Ngành nghề kinh doanh:</p>
                <div className="w-full sm:w-2/3">
                    <ul className="space-y-1 text-gray-800">
                    {details.businessLines.map((line, index) => (
                        <li key={index} className="flex items-start">
                            <span className="mr-2 mt-1 text-primary-500">•</span>
                            <span>{line.name} ({line.code})</span>
                        </li>
                    ))}
                    </ul>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BusinessInfo;