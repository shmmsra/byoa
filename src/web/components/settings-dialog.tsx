import { useState, useEffect } from 'react';
import { Button, Input, Select, Switch, Tabs, message } from 'antd';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Action, LLMConfig } from '../app';
import { events } from '../utils/events';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmConfigs: LLMConfig[];
  onLLMConfigsChange: (configs: LLMConfig[]) => void;
  actions: Action[];
  onActionsChange: (actions: Action[]) => void;
  theme: 'auto' | 'light' | 'dark';
  onThemeChange: (theme: 'auto' | 'light' | 'dark') => void;
}


export function SettingsDialog({
  open,
  onOpenChange,
  llmConfigs,
  onLLMConfigsChange,
  actions,
  onActionsChange,
  theme,
  onThemeChange,
}: SettingsDialogProps) {
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Initialize events system
  useEffect(() => {
    events.initialize();
  }, []);

  // Wrapper for theme change to emit events
  const handleThemeChange = (newTheme: 'auto' | 'light' | 'dark') => {
    onThemeChange(newTheme);
    events.triggerToOtherWebview('settings:theme-changed', { theme: newTheme });
  };

  // Wrapper for LLM configs change to emit events
  const handleLLMConfigsChange = (newConfigs: LLMConfig[]) => {
    onLLMConfigsChange(newConfigs);
    events.triggerToOtherWebview('settings:llm-configs-changed', { configs: newConfigs });
  };

  // Wrapper for actions change to emit events
  const handleActionsChange = (newActions: Action[]) => {
    onActionsChange(newActions);
    events.triggerToOtherWebview('settings:actions-changed', { actions: newActions });
  };

  const handleAddNew = () => {
    const newConfig: LLMConfig = {
      id: `llm-${Date.now()}`,
      name: 'New LLM',
      modelName: '',
      baseURL: '',
      apiKey: '',
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

    if (!editingConfig.modelName.trim()) {
      message.error('Please enter a model name');
      return;
    }

    if (!editingConfig.baseURL.trim()) {
      message.error('Please enter a base URL');
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

    handleLLMConfigsChange(updatedConfigs);
    setEditingConfig(null);
    message.success('LLM configuration saved');
  };

  const handleDelete = (id: string) => {
    const updatedConfigs = llmConfigs.filter(c => c.id !== id);
    handleLLMConfigsChange(updatedConfigs);
    message.success('LLM configuration removed');
  };

  const handleToggleEnabled = (id: string) => {
    const updatedConfigs = llmConfigs.map(c =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    handleLLMConfigsChange(updatedConfigs);
    
    // Emit event to notify other components
    const config = updatedConfigs.find(c => c.id === id);
    if (config) {
      events.triggerToOtherWebview('settings:llm-enabled-changed', {
        llmId: id,
        enabled: config.enabled
      });
    }
  };

  const toggleShowApiKey = (id: string) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Action handlers
  const handleAddNewAction = () => {
    const newAction: Action = {
      id: `action-${Date.now()}`,
      label: 'New Action',
      prompt: '',
      enabled: true,
    };
    setEditingAction(newAction);
  };

  const handleSaveAction = () => {
    if (!editingAction) return;

    if (!editingAction.label.trim()) {
      message.error('Please enter a label');
      return;
    }

    if (!editingAction.prompt.trim()) {
      message.error('Please enter a prompt');
      return;
    }

    const existingIndex = actions ? actions.findIndex(a => a.id === editingAction.id) : -1;
    let updatedActions;

    if (existingIndex >= 0) {
      updatedActions = [...(actions || [])];
      updatedActions[existingIndex] = editingAction;
    } else {
      updatedActions = [...(actions || []), editingAction];
    }

    handleActionsChange(updatedActions);
    setEditingAction(null);
    message.success('Action saved');
  };

  const handleDeleteAction = (id: string) => {
    if (!actions) return;
    const updatedActions = actions.filter(a => a.id !== id);
    handleActionsChange(updatedActions);
    message.success('Action removed');
  };

  const handleToggleActionEnabled = (id: string) => {
    if (!actions) return;
    const updatedActions = actions.map(a =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    handleActionsChange(updatedActions);
    
    // Emit event to notify other components
    const action = updatedActions.find(a => a.id === id);
    if (action) {
      events.triggerToOtherWebview('settings:action-enabled-changed', {
        actionId: id,
        enabled: action.enabled
      });
    }
  };

  return (
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
                                {config.modelName} • {config.baseURL}
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

                      {/* Row 1: Name and Model Name */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="form-field" style={{ flex: 1 }}>
                          <label>Name</label>
                          <Input
                            value={editingConfig.name}
                            onChange={(e) =>
                              setEditingConfig({ ...editingConfig, name: e.target.value })
                            }
                            placeholder="e.g., My GPT-4"
                          />
                        </div>

                        <div className="form-field" style={{ flex: 1 }}>
                          <label>Model Name</label>
                          <Input
                            value={editingConfig.modelName}
                            onChange={(e) =>
                              setEditingConfig({ ...editingConfig, modelName: e.target.value })
                            }
                            placeholder="e.g., gpt-4-turbo"
                          />
                        </div>
                      </div>

                      {/* Row 2: Base URL */}
                      <div className="form-field">
                        <label>Base URL</label>
                        <Input
                          value={editingConfig.baseURL}
                          onChange={(e) =>
                            setEditingConfig({ ...editingConfig, baseURL: e.target.value })
                          }
                          placeholder="e.g., https://api.openai.com/v1/chat/completions"
                        />
                      </div>

                      {/* Row 3: API Key */}
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
            key: 'actions',
            label: 'Actions',
            children: (
              <div style={{ padding: '16px 24px', height: '100%', overflowY: 'auto' }}>
                <div style={{ marginBottom: '16px' }}>
                  {/* Existing Actions */}
                  <div style={{ marginBottom: '16px' }}>
                    {actions && actions.length > 0 ? (
                      actions.map((action) => (
                        <div key={action.id} className="llm-config-item">
                          <div className="llm-config-header">
                            <div className="llm-config-info">
                              <Switch
                                checked={action.enabled}
                                onChange={() => handleToggleActionEnabled(action.id)}
                              />
                              <div>
                                <div style={{ fontSize: '0.875rem' }}>{action.label}</div>
                                <div className="llm-config-details">
                                  {action.prompt.length > 60 ? action.prompt.substring(0, 60) + '...' : action.prompt}
                                </div>
                              </div>
                            </div>
                            <div className="llm-config-actions">
                              <Button
                                size="small"
                                onClick={() => setEditingAction(action)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                danger
                                icon={<Trash2 size={16} />}
                                onClick={() => handleDeleteAction(action.id)}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: '#8c8c8c', padding: '12px', textAlign: 'center' }}>
                        No actions configured yet. Click "Add New Action" to create one.
                      </div>
                    )}
                  </div>

                  {/* Add New Button */}
                  <Button
                    onClick={handleAddNewAction}
                    style={{ width: '100%' }}
                    icon={<Plus size={16} />}
                  >
                    Add New Action
                  </Button>

                  {/* Edit Form */}
                  {editingAction && (
                    <div className="edit-form">
                      <h3 className="edit-form-title">
                        {actions && actions.find(a => a.id === editingAction.id) ? 'Edit' : 'Add'} Action
                      </h3>

                      {/* Label */}
                      <div className="form-field">
                        <label>Label</label>
                        <Input
                          value={editingAction.label}
                          onChange={(e) =>
                            setEditingAction({ ...editingAction, label: e.target.value })
                          }
                          placeholder="e.g., Fix Grammar"
                        />
                      </div>

                      {/* Prompt */}
                      <div className="form-field">
                        <label>Prompt</label>
                        <Input.TextArea
                          value={editingAction.prompt}
                          onChange={(e) =>
                            setEditingAction({ ...editingAction, prompt: e.target.value })
                          }
                          placeholder="e.g., Fix the grammar in: {{data}}"
                          rows={6}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#8c8c8c', marginTop: '4px' }}>
                          Use <code>{'{{data}}'}</code> to insert the clipboard content
                        </p>
                      </div>

                      <div className="form-actions">
                        <Button onClick={handleSaveAction} type="primary" style={{ flex: 1 }}>
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingAction(null)}
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
                    onChange={handleThemeChange}
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
  );
}
