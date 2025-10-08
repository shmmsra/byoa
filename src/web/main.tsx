import { createRoot } from 'react-dom/client';
import App from './app.tsx';
import './index.css';

// Wait for DOM to be ready before rendering React
function initApp() {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        console.error('Root element not found!');
        return;
    }

    createRoot(rootElement).render(<App />);
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already ready
    initApp();
}
