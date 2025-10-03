import { useState, useEffect } from 'react';
import { BrowserRouter as Router, useSearchParams } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AssistantPopup } from './components/assistant-popup';
import { SettingsDialog } from './components/settings-dialog';
import { GetClipboardData } from './utils/utility';

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  enabled: boolean;
}

function AppContent() {
  const [searchParams] = useSearchParams();
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

  const workflow = searchParams.get('workflow');

  useEffect(() => {
    window.__nativeCallback = (eventName: string, data: string) => {
      if (eventName === 'on-focus-change' && data === 'true') {
        GetClipboardData().then(data => {
          if (data && data[0] && data[0].type === 'text') {
            setClipboardContent(data[0].data as string);
          }
        });
      }
    };
  }, []);

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
        {workflow === 'assistant' ? (
          <AssistantPopup
            clipboardContent={clipboardContent}
            onClose={() => {}}
            selectedLLM={selectedLLM}
            onLLMChange={setSelectedLLM}
            availableLLMs={enabledLLMs}
          />
        ) : (
          <SettingsDialog
            open={true}
            onOpenChange={() => {}}
            llmConfigs={llmConfigs}
            onLLMConfigsChange={setLLMConfigs}
            theme={themeMode}
            onThemeChange={setThemeMode}
          />
      )}
      </div>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
