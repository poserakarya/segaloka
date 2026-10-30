import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 4200,
      strictPort: true,
      proxy: {
        '/bff': {
          target: process.env.TRAVEL_BFF_ORIGIN ||
            env.TRAVEL_BFF_ORIGIN ||
            'http://127.0.0.1:4201',
          changeOrigin: false
        }
      }
    }
  };
});
