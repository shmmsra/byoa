import { useState } from 'react';
import { Modal, Button, Input, Select, Switch, Tabs, message } from 'antd';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';

export interface LLMConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmConfigs: LLMConfig[];
  onLLMConfigsChange: (configs: LLMConfig[]) => void;
  theme: 'auto' | 'light' | 'dark';
  onThemeChange: (theme: 'auto' | 'light' | 'dark') => void;
}

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI (ChatGPT)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'custom', label: 'Custom API' },
];

const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  custom: [
    { value: 'custom', label: 'Custom Model' },
  ],
};

export function SettingsDialog({
  open,
  onOpenChange,
  llmConfigs,
  onLLMConfigsChange,
  theme,
  onThemeChange,
}: SettingsDialogProps) {
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const handleAddNew = () => {
    const newConfig: LLMConfig = {
      id: `llm-${Date.now()}`,
      name: 'New LLM',
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4-turbo',
      enabled: true,
    };
    setEditingConfig(newConfig);
  };

  const handleSave = () => {
    if (!editingConfig) return;

    if (!editingConfig.name.trim()) {
      message.error('Please enter a name');
      return;
    }

    if (!editingConfig.apiKey.trim()) {
      message.error('Please enter an API key');
      return;
    }

    const existingIndex = llmConfigs.findIndex(c => c.id === editingConfig.id);
    let updatedConfigs;

    if (existingIndex >= 0) {
      updatedConfigs = [...llmConfigs];
      updatedConfigs[existingIndex] = editingConfig;
    } else {
      updatedConfigs = [...llmConfigs, editingConfig];
    }

    onLLMConfigsChange(updatedConfigs);
    setEditingConfig(null);
    message.success('LLM configuration saved');
  };

  const handleDelete = (id: string) => {
    const updatedConfigs = llmConfigs.filter(c => c.id !== id);
    onLLMConfigsChange(updatedConfigs);
    message.success('LLM configuration removed');
  };

  const handleToggleEnabled = (id: string) => {
    const updatedConfigs = llmConfigs.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    onLLMConfigsChange(updatedConfigs);
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Modal
      title="Settings"
      open={open}
      onCancel={() => onOpenChange(false)}
      footer={null}
      width={800}
      className="settings-dialog"
      styles={{
        body: { maxHeight: '600px', padding: 0 }
      }}
    >
      <Tabs 
        defaultActiveKey="llms" 
        className="settings-tabs"
        items={[
          {
            key: 'llms',
            label: 'LLM Integrations',
            children: (
              <div style={{ padding: '16px 24px', height: '100%', overflowY: 'auto' }}>
                <div style={{ marginBottom: '16px' }}>
                  {/* Existing Configurations */}
                  <div style={{ marginBottom: '16px' }}>
                    {llmConfigs.map((config) => (
                      <div key={config.id} className="llm-config-item">
                        <div className="llm-config-header">
                          <div className="llm-config-info">
                            <Switch
                              checked={config.enabled}
                              onChange={() => handleToggleEnabled(config.id)}
                            />
                            <div>
                              <div style={{ fontSize: '0.875rem' }}>{config.name}</div>
                              <div className="llm-config-details">
                                {PROVIDER_OPTIONS.find(p => p.value === config.provider)?.label} • {config.model}
                              </div>
                            </div>
                          </div>
                          <div className="llm-config-actions">
                            <Button
                              size="small"
                              onClick={() => setEditingConfig(config)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              danger
                              icon={<Trash2 size={16} />}
                              onClick={() => handleDelete(config.id)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Button */}
                  <Button
                    onClick={handleAddNew}
                    style={{ width: '100%' }}
                    icon={<Plus size={16} />}
                  >
                    Add New LLM
                  </Button>

                  {/* Edit Form */}
                  {editingConfig && (
                    <div className="edit-form">
                      <h3 className="edit-form-title">
                        {llmConfigs.find(c => c.id === editingConfig.id) ? 'Edit' : 'Add'} LLM Configuration
                      </h3>

                      <div className="form-field">
                        <label>Name</label>
                        <Input
                          value={editingConfig.name}
                          onChange={(e) =>
                            setEditingConfig({ ...editingConfig, name: e.target.value })
                          }
                          placeholder="e.g., My ChatGPT"
                        />
                      </div>

                      <div className="form-field">
                        <label>Provider</label>
                        <Select
                          value={editingConfig.provider}
                          onChange={(value: LLMConfig['provider']) => {
                            const newModel = MODEL_OPTIONS[value][0].value;
                            setEditingConfig({ 
                              ...editingConfig, 
                              provider: value,
                              model: newModel
                            });
                          }}
                          style={{ width: '100%' }}
                        >
                          {PROVIDER_OPTIONS.map((option) => (
                            <Select.Option key={option.value} value={option.value}>
                              {option.label}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>

                      <div className="form-field">
                        <label>Model</label>
                        <Select
                          value={editingConfig.model}
                          onChange={(value) =>
                            setEditingConfig({ ...editingConfig, model: value })
                          }
                          style={{ width: '100%' }}
                        >
                          {MODEL_OPTIONS[editingConfig.provider].map((option) => (
                            <Select.Option key={option.value} value={option.value}>
                              {option.label}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>

                      <div className="form-field">
                        <label>API Key</label>
                        <div className="api-key-input">
                          <Input
                            type={showApiKey[editingConfig.id] ? 'text' : 'password'}
                            value={editingConfig.apiKey}
                            onChange={(e) =>
                              setEditingConfig({ ...editingConfig, apiKey: e.target.value })
                            }
                            placeholder="sk-..."
                            style={{ paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowApiKey(editingConfig.id)}
                            className="api-key-toggle"
                          >
                            {showApiKey[editingConfig.id] ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="form-actions">
                        <Button onClick={handleSave} type="primary" style={{ flex: 1 }}>
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingConfig(null)}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'appearance',
            label: 'Appearance',
            children: (
              <div style={{ padding: '16px 24px' }}>
                <div className="form-field">
                  <label>Theme</label>
                  <Select 
                    value={theme} 
                    onChange={onThemeChange}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="auto">Auto (Follow System)</Select.Option>
                    <Select.Option value="light">Light</Select.Option>
                    <Select.Option value="dark">Dark</Select.Option>
                  </Select>
                  <p style={{ fontSize: '0.75rem', color: '#8c8c8c', marginTop: '4px' }}>
                    Choose how the assistant should appear
                  </p>
                </div>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
}
