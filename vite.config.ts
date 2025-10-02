import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  
  return {
    root: './src/web',
    plugins: [
      react(),
      // Only apply HTML transforms in production build
      ...(!isDev ? [{
        name: 'remove-crossorigin-attributes',
        transformIndexHtml(html) {
          // Remove crossorigin, type="module", and CSP attributes for desktop app compatibility
          return html
            .replace(/\scrossorigin(?:="[^"]*")?/g, '')
            .replace(/\stype="module"/g, '')
            .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '');
        }
      }] : [])
    ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/web'),
    },
  },
    build: {
      outDir: '../../build/Resources',
      assetsDir: '',
      target: 'es2015', // Target older JS for better compatibility
      minify: false, // Disable minification to help with debugging
      rollupOptions: {
        output: {
          assetFileNames: '[name].[hash].[ext]',
          chunkFileNames: '[name].[hash].js',
          entryFileNames: '[name].[hash].js',
          format: 'iife', // Use IIFE format instead of ES modules
          manualChunks: undefined // Disable code splitting to avoid module loading issues
        }
      }
    },
    base: './',
    server: {
      port: 3000,
      open: true,
    },
  };
});
