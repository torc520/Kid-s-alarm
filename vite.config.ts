
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 设置 base 为相对路径，确保在 GitHub Pages (如 https://user.github.io/repo/) 上资源能正确加载
  base: './', 
  server: {
    host: true
  }
});
