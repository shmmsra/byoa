import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
    plugins: [react(), svgr()],
    test: {
        environment: 'jsdom',
        include: ['src/web/__tests__/**/*.test.{ts,tsx}'],
        clearMocks: true,
        restoreMocks: true,
    },
});
