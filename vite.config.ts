
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Đặt lại base về '/' để chạy đúng trên Vercel (root domain)
      base: '/', 
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Định nghĩa process.env để tránh lỗi 'process is not defined' ở runtime
        'process.env': {
            API_KEY: env.API_KEY
        },
        // Vẫn giữ fallback này để tương thích ngược nếu code gọi trực tiếp process.env.API_KEY
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
      }
    };
});
