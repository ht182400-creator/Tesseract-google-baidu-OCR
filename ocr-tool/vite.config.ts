import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite 配置：
 * - React 插件提供 JSX + 快速 HMR
 * - 开发时把 /api 代理到 Express 后端（:3001），前端无需关心跨域
 * - 构建产物输出到 dist/，由 Express 在生产模式静态托管（单端口部署）
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
