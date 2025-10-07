import { useState, useEffect } from 'react';
import { BrowserRouter as Router, useSearchParams } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AssistantPopup } from './components/assistant-popup';
import { SettingsDialog } from './components/settings-dialog';
import { ClipboardUtils } from './utils/clipboard';
import { VaultUtils } from './utils/vault';

export interface LLMConfig {
  id: string;
  name: string;
  modelName: string;
  baseURL: string;
  apiKey: string;
  enabled: boolean;
}

export interface Action {
  id: string;
  label: string;
  prompt: string;
  enabled: boolean;
}

function AppContent() {
  const [searchParams] = useSearchParams();
  const [clipboardContent, setClipboardContent] = useState('');
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [selectedLLM, setSelectedLLM] = useState<'auto' | 'all' | string>('auto');
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  const workflow = searchParams.get('workflow');

  // Load LLM configurations and actions from vault on initialization
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const configs = await VaultUtils.loadLLMConfigs();
        setLLMConfigs(configs);
        
        // Log the source of configurations for debugging
        const hasVaultConfigs = await VaultUtils.hasLLMConfigs();
        if (hasVaultConfigs) {
          console.log('Loaded LLM configurations from vault');
        } else {
          console.log('Using default LLM configurations (vault is empty)');
        }
      } catch (error) {
        console.error('Failed to load LLM configs:', error);
      }
    };

    const loadActions = async () => {
      try {
        const hasVaultActions = await VaultUtils.hasActions();
        const loadedActions = await VaultUtils.loadActions();
        
        console.log('Loaded actions:', loadedActions.length, 'actions');
        setActions(loadedActions);
        
        // If no actions in vault, save the default ones
        if (!hasVaultActions && loadedActions.length > 0) {
          console.log('Saving default actions to vault...');
          await VaultUtils.saveActions(loadedActions);
        }
        
        if (hasVaultActions) {
          console.log('Loaded actions from vault');
        } else {
          console.log('Using default actions (vault is empty)');
        }
      } catch (error) {
        console.error('Failed to load actions:', error);
      }
    };

    loadConfigs();
    loadActions();
  }, []);

  useEffect(() => {
    window.__nativeCallback = (eventName: string, data: string) => {
      if (eventName === 'on-focus-change' && data === 'true') {
        ClipboardUtils.readData().then(data => {
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

  // Handle LLM config changes and save to vault
  const handleLLMConfigsChange = async (newConfigs: LLMConfig[]) => {
    setLLMConfigs(newConfigs);
    try {
      await VaultUtils.saveLLMConfigs(newConfigs);
    } catch (error) {
      console.error('Failed to save LLM configs to vault:', error);
    }
  };

  // Handle actions changes and save to vault
  const handleActionsChange = async (newActions: Action[]) => {
    setActions(newActions);
    try {
      await VaultUtils.saveActions(newActions);
    } catch (error) {
      console.error('Failed to save actions to vault:', error);
    }
  };

  const enabledLLMs = llmConfigs.filter(llm => llm.enabled);

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
            llmConfigs={enabledLLMs}
            actions={actions}
          />
        ) : (
          <SettingsDialog
            open={true}
            onOpenChange={() => {}}
            llmConfigs={llmConfigs}
            onLLMConfigsChange={handleLLMConfigsChange}
            actions={actions}
            onActionsChange={handleActionsChange}
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
