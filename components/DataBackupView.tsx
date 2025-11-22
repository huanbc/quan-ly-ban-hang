


import React, { useState, useEffect, useRef } from 'react';
import { AppData } from '../types';
import { CloudArrowUpIcon, ComputerDesktopIcon, DownloadIcon, ArchiveBoxArrowDownIcon } from '../constants';

declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

interface DataBackupViewProps {
    getCurrentData: () => AppData;
    onRestoreData: (data: AppData) => void;
}

const CLIENT_ID = process.env.CLIENT_ID;
const API_KEY = process.env.API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'so_sach_ke_toan_data.json';

const DataBackupView: React.FC<DataBackupViewProps> = ({ getCurrentData, onRestoreData }) => {
    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [isGisLoaded, setIsGisLoaded] = useState(false);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const script1 = document.createElement('script');
        script1.src = "https://apis.google.com/js/api.js";
        script1.async = true;
        script1.defer = true;
        script1.onload = () => gapiLoaded();
        document.body.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = "https://accounts.google.com/gsi/client";
        script2.async = true;
        script2.defer = true;
        script2.onload = () => gisLoaded();
        document.body.appendChild(script2);

        return () => {
            document.body.removeChild(script1);
            document.body.removeChild(script2);
        }
    }, []);

    const gapiLoaded = async () => {
        if(typeof window.gapi === 'undefined') return;
        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            setIsGapiLoaded(true);
        });
    };

    const gisLoaded = () => {
        if(typeof window.google === 'undefined') return;
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    setIsSignedIn(true);
                    checkLastBackup();
                }
            },
        });
        setTokenClient(client);
        setIsGisLoaded(true);
    };

    const handleAuthClick = () => {
        if(!CLIENT_ID) {
            alert("Chưa cấu hình CLIENT_ID trong file .env");
            return;
        }
        if (tokenClient) {
            tokenClient.requestAccessToken();
        }
    };

    const handleSignOutClick = () => {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken('');
            setIsSignedIn(false);
            setLastBackupDate(null);
            setStatusMessage('Đã ngắt kết nối.');
        }
    };

    const checkLastBackup = async () => {
        try {
            const response = await window.gapi.client.drive.files.list({
                q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
                fields: 'files(id, name, modifiedTime)',
                spaces: 'drive',
            });
            const files = response.result.files;
            if (files && files.length > 0) {
                const file = files[0];
                setLastBackupDate(new Date(file.modifiedTime).toLocaleString('vi-VN'));
            } else {
                setLastBackupDate('Chưa có bản sao lưu nào');
            }
        } catch (err: any) {
            console.error('Error checking backup', err);
            if(err.status === 401) {
                setIsSignedIn(false);
                setStatusMessage("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.");
            }
        }
    };

    const handleBackup = async () => {
        setIsLoading(true);
        setStatusMessage('Đang sao lưu dữ liệu...');
        try {
            const data = getCurrentData();
            const fileContent = JSON.stringify(data, null, 2);
            const file = new Blob([fileContent], { type: 'application/json' });
            const metadata = {
                name: BACKUP_FILE_NAME,
                mimeType: 'application/json',
            };

            const listResponse = await window.gapi.client.drive.files.list({
                q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
                fields: 'files(id)',
            });
            
            const existingFile = listResponse.result.files?.[0];

            const accessToken = window.gapi.client.getToken().access_token;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            if (existingFile) {
                await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                    body: form,
                });
                setStatusMessage('Cập nhật bản sao lưu thành công!');
            } else {
                await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
                    body: form,
                });
                setStatusMessage('Tạo bản sao lưu mới thành công!');
            }
            await checkLastBackup();

        } catch (error: any) {
            console.error('Backup error', error);
            setStatusMessage(`Lỗi sao lưu: ${error.message || 'Không xác định'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async () => {
        if(!confirm("Dữ liệu hiện tại trên ứng dụng sẽ bị thay thế hoàn toàn bởi bản sao lưu. Bạn có chắc chắn muốn khôi phục?")) return;

        setIsLoading(true);
        setStatusMessage('Đang tải dữ liệu từ Drive...');
        try {
            const listResponse = await window.gapi.client.drive.files.list({
                q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
                fields: 'files(id)',
            });
            
            const existingFile = listResponse.result.files?.[0];
            
            if (!existingFile) {
                throw new Error("Không tìm thấy file sao lưu trên Google Drive.");
            }

            const response = await window.gapi.client.drive.files.get({
                fileId: existingFile.id,
                alt: 'media',
            });

            const data: AppData = response.result;
            
            if (data && data.transactions) {
                onRestoreData(data);
                setStatusMessage('Khôi phục dữ liệu thành công!');
            } else {
                throw new Error("File sao lưu không hợp lệ hoặc bị lỗi.");
            }

        } catch (error: any) {
            console.error('Restore error', error);
            setStatusMessage(`Lỗi khôi phục: ${error.message || 'Không xác định'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Local Backup Handlers
    const handleLocalBackup = () => {
        const data = getCurrentData();
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
            JSON.stringify(data, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `so_sach_ke_toan_backup_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
    };

    const handleLocalRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files.length > 0) {
             fileReader.readAsText(event.target.files[0], "UTF-8");
             fileReader.onload = (e) => {
                 if(e.target?.result) {
                     try {
                         const parsedData = JSON.parse(e.target.result as string);
                         if (parsedData && (parsedData.transactions || parsedData.customers)) {
                             if(confirm("Bạn có chắc chắn muốn khôi phục dữ liệu từ file này? Dữ liệu hiện tại sẽ bị thay thế.")) {
                                 onRestoreData(parsedData);
                                 // Reset input
                                 if (fileInputRef.current) fileInputRef.current.value = '';
                             }
                         } else {
                             alert("File không hợp lệ: Không tìm thấy dữ liệu ứng dụng.");
                         }
                     } catch (error) {
                         alert("Lỗi đọc file: File không đúng định dạng JSON.");
                     }
                 }
             };
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-4xl mx-auto mt-6">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <div className="bg-primary-100 p-3 rounded-full text-primary-600">
                    <CloudArrowUpIcon />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Sao lưu & Phục hồi dữ liệu</h2>
                    <p className="text-gray-500 text-sm">Quản lý an toàn dữ liệu kế toán của bạn</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Section 1: Google Drive Backup */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-blue-50 p-2 rounded text-blue-600"><CloudArrowUpIcon /></div>
                        <h3 className="font-bold text-gray-800 text-lg">Google Drive</h3>
                    </div>
                    
                    {!CLIENT_ID && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                            Thiếu <code>CLIENT_ID</code>. Thêm vào <code>.env</code>.
                        </div>
                    )}

                    {/* Connection Status */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isSignedIn ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {isSignedIn ? 'Đã kết nối' : 'Chưa kết nối'}
                            </span>
                        </div>
                        
                        {!isSignedIn ? (
                            <>
                                <button 
                                    onClick={handleAuthClick}
                                    disabled={!isGisLoaded || !isGapiLoaded || !CLIENT_ID}
                                    className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Kết nối Drive
                                </button>
                                <div className="mt-3 text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100">
                                    <p className="font-semibold">Lỗi "Access blocked"?</p>
                                    <p>Thêm địa chỉ này vào <strong>Authorized JavaScript origins</strong> trong Google Cloud Console:</p>
                                    <code className="block bg-white p-1 mt-1 rounded border break-all">{window.location.origin}</code>
                                </div>
                            </>
                        ) : (
                            <button 
                                onClick={handleSignOutClick}
                                className="w-full text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-100"
                            >
                                Ngắt kết nối
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    {isSignedIn && (
                        <div className="space-y-3">
                            <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-semibold text-blue-800">Sao lưu lên mây</h4>
                                        <p className="text-xs text-blue-600">File: <code>{BACKUP_FILE_NAME}</code></p>
                                    </div>
                                    <button 
                                        onClick={handleBackup}
                                        disabled={isLoading}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 shadow text-sm disabled:opacity-50"
                                    >
                                        {isLoading ? '...' : 'Sao lưu ngay'}
                                    </button>
                                </div>
                                {lastBackupDate && (
                                    <div className="text-xs text-blue-500 text-right">
                                        Lần cuối: {lastBackupDate}
                                    </div>
                                )}
                            </div>

                            <div className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-gray-700">Khôi phục</h4>
                                    <button 
                                        onClick={handleRestore}
                                        disabled={isLoading}
                                        className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 shadow-sm text-sm disabled:opacity-50"
                                    >
                                        {isLoading ? '...' : 'Tìm file trên Drive'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {statusMessage && (
                        <div className={`p-3 rounded-lg text-sm text-center ${statusMessage.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {statusMessage}
                        </div>
                    )}
                </div>

                {/* Section 2: Local Computer Backup */}
                <div className="space-y-4 border-l pl-0 lg:pl-8 lg:border-l-gray-200 border-t lg:border-t-0 pt-6 lg:pt-0 mt-6 lg:mt-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-purple-50 p-2 rounded text-purple-600"><ComputerDesktopIcon /></div>
                        <h3 className="font-bold text-gray-800 text-lg">Sao lưu trên máy tính</h3>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h4 className="font-semibold text-gray-800 mb-2">Tải xuống bản sao lưu</h4>
                        <p className="text-sm text-gray-500 mb-4">Lưu toàn bộ dữ liệu hiện tại thành file <code>.json</code> về máy tính của bạn.</p>
                        <button 
                            onClick={handleLocalBackup}
                            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            <DownloadIcon /> Tải về máy
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h4 className="font-semibold text-gray-800 mb-2">Khôi phục từ file</h4>
                        <p className="text-sm text-gray-500 mb-4">Chọn file <code>.json</code> từ máy tính để khôi phục dữ liệu.</p>
                        <label className="cursor-pointer w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors font-medium border border-purple-200">
                            <ArchiveBoxArrowDownIcon /> 
                            <span>Chọn file để khôi phục</span>
                            <input 
                                type="file" 
                                accept=".json" 
                                ref={fileInputRef}
                                onChange={handleLocalRestore}
                                className="hidden" 
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataBackupView;