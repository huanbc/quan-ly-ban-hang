
import React from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side - Hero/Image */}
        <div className="md:w-1/2 bg-primary-600 p-8 md:p-12 text-white flex flex-col justify-between">
          <div>
            <div className="inline-block bg-primary-700 px-3 py-1 rounded-full text-xs font-semibold mb-6 tracking-wider text-primary-100">
              PHIÊN BẢN 2.0
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
              Sổ Sách <br/>Kế Toán
            </h1>
            <p className="text-primary-100 text-lg mb-8 font-light leading-relaxed">
              Giải pháp quản lý tài chính, kho vận và bán hàng toàn diện, được thiết kế tối ưu cho hộ kinh doanh cá thể.
            </p>
            
            <div className="space-y-5">
              <div className="flex items-center gap-4 group">
                <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 3.666V14m-4.666-4H15V9m-4.666 4h4.666v3.666m-4.667-3.666L9 14M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>
                </div>
                <span className="font-medium">Quản lý Thu - Chi - Lợi nhuận</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <span className="font-medium">Theo dõi Tồn kho & Nhập xuất</span>
              </div>
               <div className="flex items-center gap-4 group">
                <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <span className="font-medium">Tự động nhập liệu hóa đơn (OCR)</span>
              </div>
            </div>
          </div>
          <div className="mt-12 text-sm text-primary-200 opacity-80">
            &copy; 2025 Lê Minh Huấn Technology
          </div>
        </div>

        {/* Right Side - Author & Action */}
        <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center items-center text-center bg-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <svg className="w-64 h-64 text-primary-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
            </div>

            <div className="mb-10 relative z-10">
                 <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mx-auto mb-6 shadow-inner p-1">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                 </div>
                 <h2 className="text-2xl font-bold text-gray-800 mb-1">Lê Minh Huấn</h2>
                 <p className="text-primary-600 font-medium mb-1">Tác giả & Nhà phát triển</p>
                 <p className="text-gray-500 text-sm">0912.041.201</p>
                 <div className="w-16 h-1 bg-primary-500 mx-auto rounded-full mt-4"></div>
            </div>

            <div className="space-y-6 w-full max-w-xs relative z-10">
                <button 
                    onClick={onEnter}
                    className="group w-full bg-primary-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-primary-700 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-3"
                >
                    <span className="text-lg">Truy cập Ứng dụng</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
                <p className="text-xs text-gray-400 px-4 leading-relaxed">
                    Ứng dụng được tối ưu hóa cho trình duyệt Chrome và Safari. Dữ liệu được lưu trữ an toàn trên thiết bị của bạn.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
