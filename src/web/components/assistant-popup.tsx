import { useState, useEffect } from 'react';
import { Button, Input, Select, Spin, message, Switch } from 'antd';
import { Copy, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import AppIcon from '../assets/app-icon.svg?react';
import { LLMConfig, Action } from '../app';
import { InvokeLLM } from '../utils/llm';
import { ClipboardUtils } from '../utils/clipboard';
import { DiffViewer } from './diff-viewer';
import { calculateStringSimilarity } from '../utils/similarity';
import { events } from '../utils/events';

interface AssistantPopupProps {
  clipboardContent: string;
  onClose: () => void;
  selectedLLM: 'auto' | 'all' | string;
  onLLMChange: (llm: 'auto' | 'all' | string) => void;
  llmConfigs: LLMConfig[];
  actions: Action[];
}

type ProcessingState = 'idle' | 'processing' | 'completed';

interface LLMResult {
  llmId: string;
  llmName: string;
  result: string;
}

export function AssistantPopup({ 
  clipboardContent, 
  onClose, 
  selectedLLM,
  onLLMChange,
  llmConfigs,
  actions
}: AssistantPopupProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [state, setState] = useState<ProcessingState>('idle');
  const [results, setResults] = useState<LLMResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [lastProcessedContent, setLastProcessedContent] = useState<string>('');
  const [showDiffViewer, setShowDiffViewer] = useState(true);

  const showAllResults = selectedLLM === 'all';
  const enabledLLMs = llmConfigs.filter(llm => llm.enabled);
  const enabledActions = actions ? actions.filter(action => action.enabled) : [];

  // Initialize events system and set up listeners
  useEffect(() => {
    events.initialize();

    // Listen for settings changes from other webviews
    const unsubscribeTheme = events.on('settings:theme-changed', (data) => {
      console.log('Theme changed in settings:', data.theme);
      // Theme changes are handled by the parent app component
    });

    const unsubscribeLLMConfigs = events.on('settings:llm-configs-changed', (data) => {
      console.log('LLM configs changed in settings:', data.configs);
      // LLM configs are handled by the parent app component
    });

    const unsubscribeActions = events.on('settings:actions-changed', (data) => {
      console.log('Actions changed in settings:', data.actions);
      // Actions are handled by the parent app component
    });

    const unsubscribeLLMEnabled = events.on('settings:llm-enabled-changed', (data) => {
      console.log('LLM enabled changed:', data.llmId, data.enabled);
      // This will be reflected when the parent component updates the props
    });

    const unsubscribeActionEnabled = events.on('settings:action-enabled-changed', (data) => {
      console.log('Action enabled changed:', data.actionId, data.enabled);
      // This will be reflected when the parent component updates the props
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeTheme();
      unsubscribeLLMConfigs();
      unsubscribeActions();
      unsubscribeLLMEnabled();
      unsubscribeActionEnabled();
    };
  }, []);

  // Reset popup state when clipboard content changes
  useEffect(() => {
    if (clipboardContent !== lastProcessedContent && clipboardContent.trim() !== '') {
      // If clipboard content is different from what was last processed, reset to idle state
      if (state === 'completed' && results.length > 0) {
        setState('idle');
        setResults([]);
        setCopied(false);
        setCustomPrompt('');
      }
    }
  }, [clipboardContent, lastProcessedContent, state, results.length]);

  // Helper function to invoke LLM using the configured baseURL
  const invokeLLM = async (config: LLMConfig, prompt: string): Promise<string> => {
    try {
      const result = await InvokeLLM(config.baseURL, config.modelName, config.apiKey, prompt);
      return result || '';
    } catch (error) {
      console.error(`Error invoking ${config.name}:`, error);
      throw new Error(`Error in ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to replace {{data}} placeholder
  const replacePlaceholder = (prompt: string): string => {
    return prompt.replace(/\{\{data\}\}/g, clipboardContent);
  };

  // Process with selected LLM(s)
  const processWithLLM = async (prompt: string) => {
    setState('processing');
    setResults([]);
    setCopied(false);

    // Replace {{data}} placeholder if present, otherwise use old format
    const input = prompt.includes('{{data}}') 
      ? replacePlaceholder(prompt)
      : `${prompt}\n\n${clipboardContent}`;
    
    try {
      if (selectedLLM === 'all') {
        // Process with all enabled LLMs
        const promises = enabledLLMs.map(async (config) => {
          try {
            const result = await invokeLLM(config, input);
            return {
              llmId: config.id,
              llmName: config.name,
              result: result
            };
          } catch (error) {
            return {
              llmId: config.id,
              llmName: config.name,
              result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        });
        
        const results = await Promise.all(promises);
        setResults(results);
        
        // Reset diff toggle based on similarity of the first result
        if (results.length > 0) {
          const firstResult = results[0];
          const similarity = calculateStringSimilarity(clipboardContent, firstResult.result);
          setShowDiffViewer(similarity.isSimilar);
        }
      } else {
        // Process with selected LLM or auto-select first enabled
        let targetConfig: LLMConfig | undefined;
        
        if (selectedLLM === 'auto') {
          targetConfig = enabledLLMs[0];
        } else {
          targetConfig = enabledLLMs.find(config => config.id === selectedLLM);
        }
        
        if (!targetConfig) {
          throw new Error('No LLM configuration found or enabled');
        }
        
        if (!targetConfig.apiKey || targetConfig.apiKey.trim() === '') {
          throw new Error(`API key not configured for ${targetConfig.name}`);
        }
        
        const result = await invokeLLM(targetConfig, input);
        const singleResult = {
          llmId: targetConfig.id,
          llmName: targetConfig.name,
          result: result
        };
        setResults([singleResult]);
        
        // Reset diff toggle based on similarity
        const similarity = calculateStringSimilarity(clipboardContent, result);
        setShowDiffViewer(similarity.isSimilar);
      }
      
      setState('completed');
      // Track the clipboard content that was processed
      setLastProcessedContent(clipboardContent);
      
    } catch (error) {
      console.error('Error processing with LLM:', error);
      message.error(error instanceof Error ? error.message : 'Failed to process request', 8);
      setState('idle');
    }
  };

  const handleQuickAction = (action: Action) => {
    processWithLLM(action.prompt);
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) {
      message.error('Please enter a prompt');
      return;
    }
    processWithLLM(customPrompt);
  };

  const handleCopy = async (text: string) => {
    try {
      const success = await ClipboardUtils.writeText(text);
      if (success) {
        setCopied(true);
        message.success('Copied to clipboard');
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        message.error('Failed to copy to clipboard');
      }
    } catch (error) {
      message.error('Failed to copy to clipboard');
      console.error('Copy failed:', error);
    }
  };

  const handleRegenerate = () => {
    if (customPrompt) {
      processWithLLM(customPrompt);
    } else if (results.length > 0) {
      // If regenerating without a custom prompt, use the last action that was performed
      // For now, we'll just reprocess with the same custom prompt if it exists
      if (customPrompt.trim()) {
        processWithLLM(customPrompt);
      }
    }
  };

  return (
    <div 
      className="assistant-popup"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="popup-header">
        <AppIcon style={{ width: '16px', height: '16px', color: '#1890ff', flexShrink: 0 }} />
        <h2 style={{ fontSize: '0.875rem', flex: 1, margin: 0, fontWeight: 500, color: '#262626' }}>AI Assistant</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {state === 'completed' && results.length > 0 && (
            <>
              <span className="diff-toggle-label">Diff</span>
              <Switch
                size="small"
                checked={showDiffViewer}
                onChange={setShowDiffViewer}
              />
            </>
          )}
          <Select 
            value={selectedLLM} 
            onChange={onLLMChange}
            style={{ width: 140 }}
            size="small"
          >
            <Select.Option value="auto">Auto</Select.Option>
            {enabledLLMs.length > 1 && (
              <Select.Option value="all">All LLMs</Select.Option>
            )}
            {enabledLLMs.map((llm) => (
              <Select.Option key={llm.id} value={llm.id}>
                {llm.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="popup-content">
        {/* Left Panel - Actions & Prompt */}
        <div className="left-panel">
          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="quick-actions-grid">
              {enabledActions.length > 0 ? (
                enabledActions.map((action) => (
                  <Button
                    key={action.id}
                    size="small"
                    onClick={() => handleQuickAction(action)}
                    disabled={state === 'processing' || !clipboardContent}
                    style={{ 
                      justifyContent: 'flex-start', 
                      height: '28px', 
                      fontSize: '0.75rem',
                      padding: '0 8px',
                      textAlign: 'left'
                    }}
                  >
                    {action.label}
                  </Button>
                ))
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#8c8c8c', padding: '8px' }}>
                  No actions available. Configure actions in Settings.
                </div>
              )}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="custom-prompt-section">
            <div className="custom-prompt-container">
              <Input.TextArea
                placeholder="or type a custom prompt..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={state === 'processing'}
                style={{ 
                  flex: 1, 
                  resize: 'none', 
                  fontSize: '0.875rem',
                  paddingRight: '40px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleCustomPrompt();
                  }
                }}
              />
              <button
                onClick={handleCustomPrompt}
                disabled={state === 'processing' || !clipboardContent || !customPrompt.trim()}
                className="send-button"
                title="Send (⌘↵)"
              >
                {state === 'processing' ? (
                  <Spin size="small" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Content/Results */}
        <div className="right-panel">
          <div className="results-container">
            {state === 'idle' && (
              <div className="clipboard-content">
                {clipboardContent || 'No content in clipboard'}
              </div>
            )}

            {state === 'processing' && (
              <div className="processing-state">
                <Spin size="large" />
                <div className="processing-text">Processing...</div>
              </div>
            )}

            {state === 'completed' && results.length > 0 && (
              <div>
                {results.map((result, index) => (
                  <div key={result.llmId} className="result-item">
                    <div className="result-header">
                      {showAllResults && (
                        <div style={{ fontSize: '0.75rem', color: '#8c8c8c', fontWeight: 500 }}>
                          {result.llmName}
                        </div>
                      )}
                      <div className="result-actions">
                        <button
                          onClick={handleRegenerate}
                          className="result-action-button"
                          title="Regenerate"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          onClick={() => handleCopy(result.result)}
                          className="result-action-button"
                          title="Copy to clipboard"
                        >
                          {copied ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="result-content">
                      <DiffViewer 
                        original={clipboardContent} 
                        result={result.result}
                        threshold={0.7}
                        showDiff={showDiffViewer}
                      />
                    </div>
                    {showAllResults && index < results.length - 1 && (
                      <div style={{ borderTop: '1px solid #d9d9d9', margin: '16px 0' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
