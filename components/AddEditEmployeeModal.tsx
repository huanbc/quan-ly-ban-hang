
import React, { useState, useEffect } from 'react';
import { Employee, UserRole } from '../types';

interface Props {
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'id'> | Employee) => void;
  employee: Employee | null;
}

const AddEditEmployeeModal: React.FC<Props> = ({ onClose, onSave, employee }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.SALES);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setUsername(employee.username || '');
      setPassword(employee.password || '');
      setRole(employee.role);
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password) {
      setError('Tên nhân viên, tài khoản và mật khẩu là bắt buộc.');
      return;
    }
    const employeeData = { 
      name, 
      username,
      password,
      role,
    };
    if (employee) {
      onSave({ ...employee, ...employeeData });
    } else {
      onSave(employeeData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {employee ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên nhân viên</label>
                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Tên tài khoản</label>
                <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                <input type="text" id="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"/>
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Vai trò</label>
                <select 
                    id="role" 
                    value={role} 
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                    {Object.values(UserRole).map(r => (
                        <option key={r} value={r}>{r}</option>
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

export default AddEditEmployeeModal;