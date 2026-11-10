import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    host: '0.0.0.0', port: Number(process.env.REDLINE_WEB_PORT || 5180), strictPort: true,
    allowedHosts: ['localhost', '.localhost', '.teamtrader.co.za'],
    proxy: {
      '/assets': { target: 'http://localhost:3001', changeOrigin: true },
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket': { target: 'ws://localhost:3001', ws: true, changeOrigin: true }
    }
  },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 900 }
});
