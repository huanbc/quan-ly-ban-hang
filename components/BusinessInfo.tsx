
import React from 'react';

const BusinessInfo: React.FC = () => {
  const businessDetails = {
    taxpayerName: 'Hoàng Văn Phan',
    storeName: 'HTP STORE',
    bankAccount: '9385372863',
    taxId: '022090004221',
    businessLines: [
      'Photo, chuẩn bị tài liệu',
      'Bán lẻ thiết bị nghe nhìn trong các cửa hàng chuyên doanh',
      'Bán lẻ đồ điện gia dụng, đèn và bộ đèn điện trong các cửa hàng chuyên doanh',
      'Bán lẻ sách, báo, tạp chí văn phòng phẩm trong các cửa hàng chuyên doanh',
      'Bán lẻ máy vi tính, thiết bị ngoại vi, phần mềm trong các cửa hàng chuyên doanh',
      'Tư vấn máy vi tính và quản trị hệ thống máy vi tính',
      'Hoạt động dịch vụ công nghệ thông tin và dịch vụ khác liên quan đến máy vi tính',
      'Cổng thông tin',
      'Sửa chữa máy vi tính và thiết bị ngoại vi',
      'Dịch vụ liên quan đến in',
    ],
    address: 'Thôn Đồng Giàng B, Xã Lương Minh, Huyện Ba Chẽ, Tỉnh Quảng Ninh',
    phone: '0385372863',
    email: 'contact.htpgroup@gmail.com',
  };

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col sm:flex-row py-1">
      <p className="w-full sm:w-1/3 font-semibold text-gray-600">{label}:</p>
      <p className="w-full sm:w-2/3 text-gray-800">{value}</p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
      <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">Thông Tin Hộ Kinh Doanh</h2>
      <div className="space-y-2 text-sm">
        <InfoItem label="Tên người nộp thuế" value={businessDetails.taxpayerName} />
        <InfoItem label="Tên cửa hàng" value={businessDetails.storeName} />
        <InfoItem label="Mã số thuế" value={businessDetails.taxId} />
        <InfoItem label="Tài khoản ngân hàng" value={businessDetails.bankAccount} />
        <InfoItem label="Địa chỉ kinh doanh" value={businessDetails.address} />
        <InfoItem label="Điện thoại" value={businessDetails.phone} />
        <InfoItem label="Email" value={businessDetails.email} />
        <div className="flex flex-col sm:flex-row py-1">
          <p className="w-full sm:w-1/3 font-semibold text-gray-600 pt-1">Ngành nghề kinh doanh:</p>
          <div className="w-full sm:w-2/3">
            <ul className="space-y-1 text-gray-800">
              {businessDetails.businessLines.map((line, index) => (
                <li key={index} className="flex items-start">
                    <span className="mr-2 mt-1 text-primary-500">•</span>
                    <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessInfo;
