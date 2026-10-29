import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: 'D:/Server-Segaloka/.cache/vite/vendor-dashboard',
  server: {
    host: '127.0.0.1',
    port: 4204,
    strictPort: true,
    proxy: {
      '/bff': {
        target: 'http://127.0.0.1:4211',
        changeOrigin: false
      }
    }
  }
});

