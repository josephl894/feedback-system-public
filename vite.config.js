import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 3000,
    // 允许 ngrok 域名访问（解决通过 ngrok 访问时的 Host 检查问题）
    allowedHosts: [
      'localhost',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok.app'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // 外部API代理 - 指向本地 yoyo-content API 服务器
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // 保持路径不变
      }
    }
  }
})

