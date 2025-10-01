import { useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { AssistantPopup } from './components/AssistantPopup';
import { SettingsDialog, LLMConfig } from './components/SettingsDialog';
import { AppMenuBar } from './components/AppMenuBar';
import { AppIcon } from './components/AppIcon';

// Mock clipboard content for demo
const MOCK_CLIPBOARD = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}`;

export default function App() {
  const [showAssistant, setShowAssistant] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [clipboardContent, setClipboardContent] = useState('');
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [selectedLLM, setSelectedLLM] = useState<'auto' | 'all' | string>('auto');
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([
    {
      id: 'llm-1',
      name: 'ChatGPT',
      provider: 'openai',
      apiKey: 'sk-mock-key-***',
      model: 'gpt-4-turbo',
      enabled: true,
    },
    {
      id: 'llm-2',
      name: 'Claude',
      provider: 'anthropic',
      apiKey: 'sk-ant-mock-key-***',
      model: 'claude-3-opus',
      enabled: true,
    },
  ]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Listen for keyboard shortcut (simulated with Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open assistant
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        
        // In a real app, this would read from the system clipboard
        // For demo, we'll use mock data
        try {
          const text = await navigator.clipboard.readText();
          setClipboardContent(text || MOCK_CLIPBOARD);
        } catch (err) {
          // Fallback to mock if clipboard access fails
          setClipboardContent(MOCK_CLIPBOARD);
        }
        
        setShowAssistant(true);
      }

      // Cmd/Ctrl + , to open settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside to close assistant
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowAssistant(false);
    }
  };

  const handleQuit = () => {
    // In a real desktop app, this would close the application
    console.log('Quit application');
  };

  const enabledLLMs = llmConfigs.filter(llm => llm.enabled).map(llm => ({
    id: llm.id,
    name: llm.name,
    enabled: llm.enabled,
  }));

  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <div className={`app-container ${isDark ? 'dark' : ''}`}>
        {/* Menubar */}
        <div className="menu-bar">
          <AppMenuBar
            selectedLLM={selectedLLM}
            onLLMChange={setSelectedLLM}
            availableLLMs={enabledLLMs}
            onOpenSettings={() => setShowSettings(true)}
            onQuit={handleQuit}
          />
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          <div className="content-center">
            <div className="app-icon-container">
              <AppIcon style={{ width: '32px', height: '32px', color: '#1890ff' }} />
            </div>
            <h1 className="app-title">AI Assistant</h1>
            <p className="app-description">
              Press <kbd className="keyboard-shortcut">⌘K</kbd> or{' '}
              <kbd className="keyboard-shortcut">Ctrl+K</kbd> to open the assistant
            </p>
            <p className="app-description" style={{ fontSize: '0.875rem' }}>
              The assistant will load content from your clipboard and help you with quick actions or custom prompts.
            </p>
            <div className="demo-button">
              <button
                onClick={() => {
                  setClipboardContent(MOCK_CLIPBOARD);
                  setShowAssistant(true);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1890ff',
                  color: '#ffffff',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#40a9ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1890ff';
                }}
              >
                Try Demo
              </button>
            </div>
          </div>
        </div>

        {/* Assistant Popup Overlay */}
        {showAssistant && (
          <div
            className="assistant-overlay"
            onClick={handleBackdropClick}
          >
            <AssistantPopup
              clipboardContent={clipboardContent}
              onClose={() => setShowAssistant(false)}
              selectedLLM={selectedLLM}
              onLLMChange={setSelectedLLM}
              availableLLMs={enabledLLMs}
            />
          </div>
        )}

        {/* Settings Dialog */}
        <SettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          llmConfigs={llmConfigs}
          onLLMConfigsChange={setLLMConfigs}
          theme={theme}
          onThemeChange={setTheme}
        />
      </div>
    </ConfigProvider>
  );
}
