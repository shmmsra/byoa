import { useState, useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { AssistantPopup } from './components/AssistantPopup';

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  enabled: boolean;
}

export default function App() {
  const [showAssistant, setShowAssistant] = useState(true);
  const [clipboardContent, setClipboardContent] = useState('');
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>('auto');
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
    
    if (themeMode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', themeMode === 'dark');
    }
  }, [themeMode]);

  const enabledLLMs = llmConfigs.filter(llm => llm.enabled).map(llm => ({
    id: llm.id,
    name: llm.name,
    enabled: llm.enabled,
  }));

  const isDark = themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <div className={`app-container ${isDark ? 'dark' : ''}`}>
        {/* Assistant Popup Overlay */}
        {showAssistant && (
            <AssistantPopup
              clipboardContent={clipboardContent}
              onClose={() => setShowAssistant(false)}
              selectedLLM={selectedLLM}
              onLLMChange={setSelectedLLM}
              availableLLMs={enabledLLMs}
            />
        )}
      </div>
    </ConfigProvider>
  );
}
