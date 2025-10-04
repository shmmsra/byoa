import { useState } from 'react';
import { Button, Input, Select, Spin, message } from 'antd';
import { Copy, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import AppIcon from '../assets/app-icon.svg?react';
import { InvokeGemini, InvokeOpenAI, InvokePerplexity } from '../utils/utility';
import { LLMConfig } from '../app';

interface AssistantPopupProps {
  clipboardContent: string;
  onClose: () => void;
  selectedLLM: 'auto' | 'all' | string;
  onLLMChange: (llm: 'auto' | 'all' | string) => void;
  llmConfigs: LLMConfig[];
}

type ProcessingState = 'idle' | 'processing' | 'completed';

interface LLMResult {
  llmId: string;
  llmName: string;
  result: string;
}

const QUICK_ACTIONS = [
  { label: 'Fix Grammar', prompt: 'Fix the grammar and spelling in the following text:' },
  { label: 'Improve Writing', prompt: 'Improve the writing quality of the following text:' },
  { label: 'Summarize', prompt: 'Summarize the following text:' },
  { label: 'Translate', prompt: 'Translate the following text to English:' },
  { label: 'Simplify', prompt: 'Simplify the following text:' },
  { label: 'Make Longer', prompt: 'Expand and make the following text longer:' },
  { label: 'Make Shorter', prompt: 'Make the following text more concise:' },
  { label: 'Convert to Code', prompt: 'Convert the following to code:' },
  { label: 'Explain Code', prompt: 'Explain what this code does:' },
];

export function AssistantPopup({ 
  clipboardContent, 
  onClose, 
  selectedLLM,
  onLLMChange,
  llmConfigs 
}: AssistantPopupProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [state, setState] = useState<ProcessingState>('idle');
  const [results, setResults] = useState<LLMResult[]>([]);
  const [copied, setCopied] = useState(false);

  const showAllResults = selectedLLM === 'all';
  const enabledLLMs = llmConfigs.filter(llm => llm.enabled);

  // Helper function to invoke the appropriate LLM based on provider
  const invokeLLM = async (config: LLMConfig, prompt: string): Promise<string> => {
    try {
      switch (config.provider) {
        case 'gemini':
          return await InvokeGemini(config.model, config.apiKey, prompt);
        case 'openai':
          return await InvokeOpenAI(config.model, config.apiKey, prompt);
        case 'anthropic':
          // TODO: Add InvokeAnthropic function for proper Anthropic API support
          // For now, using OpenAI format as placeholder
          return await InvokeOpenAI(config.model, config.apiKey, prompt);
        case 'perplexity':
          return await InvokePerplexity(config.model, config.apiKey, prompt);
        case 'custom':
          // Default to Gemini for custom provider
          return await InvokeGemini(config.model, config.apiKey, prompt);
        default:
          return await InvokeGemini(config.model, config.apiKey, prompt);
      }
    } catch (error) {
      console.error(`Error invoking ${config.provider}:`, error);
      throw new Error(`Failed to get response from ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Process with selected LLM(s)
  const processWithLLM = async (prompt: string) => {
    setState('processing');
    setResults([]);
    setCopied(false);

    const input = `${prompt}\n\n${clipboardContent}`;
    
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
        setResults([{
          llmId: targetConfig.id,
          llmName: targetConfig.name,
          result: result
        }]);
      }
      
      setState('completed');
    } catch (error) {
      console.error('Error processing with LLM:', error);
      message.error(error instanceof Error ? error.message : 'Failed to process request');
      setState('idle');
    }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
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
      // Use our native clipboard API if available, fallback to browser API
      if (window.saucer?.exposed?.clipboard_writeText) {
        await window.saucer.exposed.clipboard_writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      message.success('Copied to clipboard');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      message.error('Failed to copy to clipboard');
      console.error('Copy failed:', error);
    }
  };

  const handleRegenerate = () => {
    if (customPrompt) {
      processWithLLM(customPrompt);
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

      {/* Content */}
      <div className="popup-content">
        {/* Left Panel - Actions & Prompt */}
        <div className="left-panel">
          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="quick-actions-grid">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
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
              ))}
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
                      {result.result}
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
