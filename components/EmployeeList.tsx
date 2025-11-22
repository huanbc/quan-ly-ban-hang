
import React, { useState } from 'react';
import { Employee, UserRole } from '../types';
import { PlusIcon } from '../constants';
import AddEditEmployeeModal from './AddEditEmployeeModal';

interface EmployeeListProps {
  employees: Employee[];
  onAdd: (employee: Omit<Employee, 'id'>) => void;
  onUpdate: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleOpenModal = (employee: Employee | null = null) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingEmployee(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700 mb-4 sm:mb-0">Quản Lý Nhân Viên</h2>
          <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg shadow hover:bg-primary-700 transition-colors">
            <PlusIcon />
            <span>Thêm Mới</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          {employees.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Nhân Viên</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài khoản</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mật khẩu</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai Trò</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Hành động</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map(employee => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {employee.username || '-'}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {employee.password || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            employee.role === UserRole.ADMIN ? 'bg-red-100 text-red-800' :
                            employee.role === UserRole.ACCOUNTANT ? 'bg-blue-100 text-blue-800' :
                            employee.role === UserRole.SALES ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                            {employee.role}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleOpenModal(employee)} className="text-primary-600 hover:text-primary-900">Sửa</button>
                      <button 
                        onClick={() => onDelete(employee.id)} 
                        className="text-red-600 hover:text-red-900"
                        disabled={employee.role === UserRole.ADMIN && employees.filter(e => e.role === UserRole.ADMIN).length === 1}
                        title={employee.role === UserRole.ADMIN && employees.filter(e => e.role === UserRole.ADMIN).length === 1 ? "Không thể xóa quản trị viên cuối cùng" : ""}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Chưa có nhân viên nào.</p>
            </div>
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddEditEmployeeModal
          onClose={handleCloseModal}
          onSave={editingEmployee ? onUpdate : onAdd}
          employee={editingEmployee}
        />
      )}
    </>
  );
};

export default EmployeeList;