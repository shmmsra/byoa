import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  root: './src/web',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/web'),
    },
  },
  build: {
    outDir: '../../build/Resources',
  },
  server: {
    port: 3000,
    open: true,
  },
});
