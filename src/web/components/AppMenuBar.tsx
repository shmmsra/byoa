import { Dropdown, Button } from 'antd';
import { Settings, LogOut, Check } from 'lucide-react';
import { AppIcon } from './AppIcon';

export interface LLMOption {
  id: string;
  name: string;
  enabled: boolean;
}

interface AppMenuBarProps {
  selectedLLM: 'auto' | 'all' | string;
  onLLMChange: (llm: 'auto' | 'all' | string) => void;
  availableLLMs: LLMOption[];
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function AppMenuBar({
  selectedLLM,
  onLLMChange,
  availableLLMs,
  onOpenSettings,
  onQuit,
}: AppMenuBarProps) {
  const enabledLLMs = availableLLMs.filter(llm => llm.enabled);

  const menuItems = [
    {
      key: 'section-title',
      label: <div className="menu-section-title">Select LLM</div>,
      disabled: true,
    },
    {
      key: 'auto',
      label: (
        <div className="menu-item">
          <span>Auto</span>
          {selectedLLM === 'auto' && <Check className="menu-item-check" />}
        </div>
      ),
      onClick: () => onLLMChange('auto'),
    },
    ...(enabledLLMs.length > 1 ? [{
      key: 'all',
      label: (
        <div className="menu-item">
          <span>All LLMs</span>
          {selectedLLM === 'all' && <Check className="menu-item-check" />}
        </div>
      ),
      onClick: () => onLLMChange('all'),
    }] : []),
    ...enabledLLMs.map((llm) => ({
      key: llm.id,
      label: (
        <div className="menu-item">
          <span>{llm.name}</span>
          {selectedLLM === llm.id && <Check className="menu-item-check" />}
        </div>
      ),
      onClick: () => onLLMChange(llm.id),
    })),
    {
      type: 'divider' as const,
    },
    {
      key: 'settings',
      label: (
        <div className="menu-item">
          <Settings className="menu-item-icon" size={16} />
          <span>Settings</span>
        </div>
      ),
      onClick: onOpenSettings,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'quit',
      label: (
        <div className="menu-item">
          <LogOut className="menu-item-icon" size={16} />
          <span>Quit</span>
        </div>
      ),
      onClick: onQuit,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      className="menu-bar-dropdown"
    >
      <Button
        type="text"
        className="menu-bar-trigger"
        icon={<AppIcon style={{ width: '16px', height: '16px' }} />}
      >
        AI Assistant
      </Button>
    </Dropdown>
  );
}
