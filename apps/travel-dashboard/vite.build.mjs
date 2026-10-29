import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: 'D:/Server-Segaloka/.cache/vite/travel-dashboard',
  build: { outDir: 'D:/Server-Segaloka/apps/travel-dashboard/dist' }
});
