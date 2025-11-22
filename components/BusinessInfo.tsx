
import React, { useState, useEffect, useMemo } from 'react';
import { BusinessDetails } from '../types';
import { businessCodes } from '../data/businessCodes';

// Inline icons to avoid dependency issues
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const CancelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

interface BusinessInfoProps {
    details: BusinessDetails;
    onUpdate: (details: BusinessDetails) => void;
}

// Move components outside to prevent re-mounting on render
const InfoBlock = ({ label, value, fullWidth = false }: { label: string; value: string, fullWidth?: boolean }) => (
    <div className={`${fullWidth ? 'col-span-2' : 'col-span-1'} bg-gray-50 p-3 rounded-lg border border-gray-100`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-gray-800 font-medium truncate" title={value}>{value || '---'}</p>
    </div>
);

const EditInput = ({ 
    label, 
    name, 
    value, 
    onChange, 
    placeholder, 
    fullWidth = false 
}: { 
    label: string; 
    name: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string; 
    fullWidth?: boolean 
}) => (
    <div className={`${fullWidth ? 'col-span-2' : 'col-span-1'}`}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type='text'
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-gray-800 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
        />
    </div>
);

const BusinessInfo: React.FC<BusinessInfoProps> = ({ details, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(details);

  useEffect(() => {
    setFormData(details);
  }, [details]);

  // Optimization for large datalist
  const businessOptions = useMemo(() => (
      <datalist id="business-names">
          {businessCodes.map(bc => <option key={bc.code} value={bc.name} />)}
      </datalist>
  ), []);

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
      // Try strict match first
      let match = businessCodes.find(bc => bc.name === value);
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
        businessLines: formData.businessLines.filter(line => line.code.trim() || line.name.trim())
    };
    onUpdate(cleanedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(details);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-gray-100">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Thông Tin Hộ Kinh Doanh
            </h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin hiển thị trên các báo cáo và chứng từ</p>
        </div>
        {!isEditing && (
            <button 
                onClick={() => setIsEditing(true)} 
                className="flex items-center space-x-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
                <EditIcon />
                <span>Chỉnh Sửa</span>
            </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-6 animate-fadeIn">
            {/* Section 1: General */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-800 uppercase mb-3">Thông tin chung</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditInput label="Tên người nộp thuế" name="taxpayerName" value={formData.taxpayerName} onChange={handleInputChange} placeholder="VD: Nguyễn Văn A" />
                    <EditInput label="Tên cửa hàng / HKD" name="storeName" value={formData.storeName} onChange={handleInputChange} placeholder="VD: Cửa hàng tạp hóa ABC" />
                    <EditInput label="Mã số thuế" name="taxId" value={formData.taxId} onChange={handleInputChange} placeholder="Mã số thuế cá nhân hoặc HKD" />
                    <EditInput label="Tài khoản ngân hàng" name="bankAccount" value={formData.bankAccount} onChange={handleInputChange} placeholder="Số TK - Ngân hàng - Chi nhánh" />
                </div>
            </div>

            {/* Section 2: Contact */}
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Liên hệ & Địa chỉ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <EditInput label="Số điện thoại" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Số điện thoại liên hệ" />
                    <EditInput label="Email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email nhận thông báo" />
                    <EditInput label="Địa chỉ kinh doanh" name="address" value={formData.address} onChange={handleInputChange} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" fullWidth />
                </div>
            </div>
            
            {/* Section 3: Business Lines */}
             <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-yellow-800 uppercase">Ngành nghề kinh doanh</h3>
                    <button type="button" onClick={addBusinessLine} className="text-xs flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200 transition-colors font-medium">
                        <PlusIcon /> Thêm dòng
                    </button>
                </div>
                
                {businessOptions}

                <div className="space-y-2">
                    {formData.businessLines.map((line, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <div className="w-24 flex-shrink-0">
                                <input
                                    type="text"
                                    placeholder="Mã ngành"
                                    value={line.code}
                                    onChange={(e) => handleBusinessLineChange(index, 'code', e.target.value)}
                                    className="w-full px-3 py-2 text-gray-800 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                                    title="Nhập mã ngành cấp 4 hoặc cấp 5"
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Nhập tên ngành nghề để tìm kiếm..."
                                    value={line.name}
                                    onChange={(e) => handleBusinessLineChange(index, 'name', e.target.value)}
                                    list="business-names"
                                    className="w-full px-3 py-2 text-gray-800 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={() => removeBusinessLine(index)} 
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xóa dòng này"
                            >
                                <DeleteIcon />
                            </button>
                        </div>
                    ))}
                    {formData.businessLines.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm italic border border-dashed border-gray-300 rounded-lg bg-white">
                            Chưa có ngành nghề nào. Nhấn "Thêm dòng" để thêm.
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                    onClick={handleCancel} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all"
                >
                    <CancelIcon /> Hủy bỏ
                </button>
                <button 
                    onClick={handleSave} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 border border-transparent rounded-lg shadow-md text-sm font-medium text-white hover:bg-primary-700 hover:shadow-lg transition-all transform active:scale-95"
                >
                    <SaveIcon /> Lưu thay đổi
                </button>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <InfoBlock label="Tên người nộp thuế" value={details.taxpayerName} />
                <InfoBlock label="Tên cửa hàng / HKD" value={details.storeName} />
                <InfoBlock label="Mã số thuế" value={details.taxId} />
                <InfoBlock label="Tài khoản ngân hàng" value={details.bankAccount} />
                <InfoBlock label="Số điện thoại" value={details.phone} />
                <InfoBlock label="Email" value={details.email} />
                <InfoBlock label="Địa chỉ kinh doanh" value={details.address} fullWidth />
            </div>

            <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary-500 rounded-full"></span>
                    Ngành nghề kinh doanh đăng ký
                </h4>
                {details.businessLines.length > 0 ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                        <ul className="divide-y divide-gray-100">
                            {details.businessLines.map((line, index) => (
                                <li key={index} className="p-3 flex items-start gap-3 hover:bg-gray-100 transition-colors">
                                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {line.code}
                                    </span>
                                    <span className="text-sm text-gray-700">{line.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">Chưa cập nhật thông tin ngành nghề.</p>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default BusinessInfo;
