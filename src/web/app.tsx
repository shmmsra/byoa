import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, useSearchParams } from 'react-router-dom';
import { ConfigProvider, Spin, message, theme } from 'antd';
import { AssistantPopup } from './components/assistant-popup';
import { SettingsDialog } from './components/settings-dialog';
import { ClipboardUtils } from './utils/clipboard';
import { VaultUtils } from './utils/vault';
import { events } from './utils/events';

export type ThemeMode =
    | 'auto'
    | 'light'
    | 'dark'
    | 'orange'
    | 'skyblue'
    | 'lightgreen'
    | 'high-contrast-light'
    | 'high-contrast-dark';

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

export interface HistoryEntry {
    id: number;
    request: string;
    systemContent: string;
    response: string | null;
    model: string;
    llmConfigName: string;
    actionId: string;
    actionName: string;
    status: 'success' | 'error';
    errorMessage: string;
    responseTimeMs: number | null;
    requestedAt: string;
    schemaVersion: number;
    // Name of the app that was in the foreground when the shortcut was triggered.
    // Stamped in natively (see webview-wrapper.cpp), so it's optional here since
    // rows written before this field existed won't have it populated.
    focusedAppName?: string;
}

export interface HistoryFilter {
    keyword?: string;
    model?: string;
    status?: 'success' | 'error';
    limit?: number;
    offset?: number;
}

function resolveSelectedLLM(selection: string, configs: LLMConfig[]): string {
    return selection === 'auto' ||
        selection === 'all' ||
        configs.some(config => config.id === selection && config.enabled)
        ? selection
        : 'auto';
}

function AppContent() {
    const [searchParams] = useSearchParams();
    const [clipboardContent, setClipboardContent] = useState('');
    const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
    const [selectedLLM, setSelectedLLM] = useState<'auto' | 'all' | string>('auto');
    const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
    const [actions, setActions] = useState<Action[]>([]);
    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    const [selectionSaving, setSelectionSaving] = useState(false);
    const popupSession = useRef({ visible: true, generation: 0 });
    const selectionSave = useRef(Promise.resolve());

    const workflow = searchParams.get('workflow');

    // Load LLM configurations and actions from vault on initialization
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const [configs, selection] = await Promise.all([
                    VaultUtils.loadLLMConfigs(),
                    workflow === 'assistant' ? VaultUtils.loadSelectedLLM() : 'auto',
                ]);
                setLLMConfigs(configs);
                setSelectedLLM(resolveSelectedLLM(selection, configs));
                setPreferencesLoaded(true);

                // Log the source of configurations for debugging
                const hasVaultConfigs = await VaultUtils.hasLLMConfigs();
                if (hasVaultConfigs) {
                    console.log('Loaded LLM configurations from vault');
                } else {
                    console.log('Using default LLM configurations (vault is empty)');
                }
            } catch (error) {
                console.error('Failed to load LLM configs:', error);
                setPreferencesLoaded(true);
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

        const loadTheme = async () => {
            try {
                const savedTheme = await VaultUtils.loadTheme();
                setThemeMode(savedTheme);

                const hasVaultTheme = await VaultUtils.hasTheme();
                if (hasVaultTheme) {
                    console.log('Loaded theme from vault:', savedTheme);
                } else {
                    console.log('Using default theme (vault is empty)');
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };

        loadConfigs();
        loadActions();
        loadTheme();
    }, [workflow]);

    useEffect(() => {
        // Initialize events system
        events.initialize();
        popupSession.current.visible = true;

        // Set up native callback for clipboard changes and events
        const nativeCallback = (eventName: string, data: string) => {
            if (eventName === 'on-focus-change') {
                const visible = data === 'true';
                popupSession.current.visible = visible;
                if (!visible) {
                    popupSession.current.generation++;
                    message.destroy();
                }
                events.emit('assistant:visibility-changed', { visible });
            }
            // Handle clipboard focus changes
            if (eventName === 'on-focus-change' && data === 'true') {
                ClipboardUtils.readData().then(data => {
                    if (data && data[0] && data[0].type === 'text') {
                        setClipboardContent(data[0].data as string);
                    }
                });
            }

            // Handle events from other webviews
            events.handleNativeEvent(eventName, data);
        };
        window.__nativeCallback = nativeCallback;

        // Listen for settings changes from other webviews
        const unsubscribeTheme = events.on('settings:theme-changed', async data => {
            console.log('Theme changed, updating:', data.theme);
            setThemeMode(data.theme);

            // Save theme to vault
            try {
                await VaultUtils.saveTheme(data.theme);
            } catch (error) {
                console.error('Failed to save theme to vault:', error);
            }
        });

        const unsubscribeLLMConfigs = events.on('settings:llm-configs-changed', async () => {
            console.log('LLM configs changed, refreshing from vault');
            try {
                const configs = await VaultUtils.loadLLMConfigs();
                setLLMConfigs(configs);
                setSelectedLLM(selection => resolveSelectedLLM(selection, configs));
            } catch (error) {
                console.error('Failed to refresh LLM configs:', error);
            }
        });

        const unsubscribeActions = events.on('settings:actions-changed', async () => {
            console.log('Actions changed, refreshing from vault');
            try {
                const loadedActions = await VaultUtils.loadActions();
                setActions(loadedActions);
            } catch (error) {
                console.error('Failed to refresh actions:', error);
            }
        });

        // Cleanup listeners on unmount
        return () => {
            if (window.__nativeCallback === nativeCallback) {
                delete window.__nativeCallback;
            }
            popupSession.current.visible = false;
            popupSession.current.generation++;
            unsubscribeTheme();
            unsubscribeLLMConfigs();
            unsubscribeActions();
        };
    }, []);

    // Apply theme
    useEffect(() => {
        const root = document.documentElement;

        // Remove all theme classes first
        root.classList.remove(
            'dark',
            'theme-orange',
            'theme-skyblue',
            'theme-lightgreen',
            'theme-high-contrast-light',
            'theme-high-contrast-dark',
        );

        if (themeMode === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.toggle('dark', prefersDark);
        } else if (themeMode === 'dark') {
            root.classList.add('dark');
        } else if (themeMode === 'orange') {
            root.classList.add('theme-orange');
        } else if (themeMode === 'skyblue') {
            root.classList.add('theme-skyblue');
        } else if (themeMode === 'lightgreen') {
            root.classList.add('theme-lightgreen');
        } else if (themeMode === 'high-contrast-light') {
            root.classList.add('theme-high-contrast-light');
        } else if (themeMode === 'high-contrast-dark') {
            root.classList.add('theme-high-contrast-dark');
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

    const handleLLMChange = (selection: string) => {
        setSelectedLLM(selection);
        setSelectionSaving(true);
        const generation = popupSession.current.generation;
        const save = selectionSave.current.then(async () => {
            try {
                await VaultUtils.saveSelectedLLM(selection);
            } catch (error) {
                console.error('Failed to save selected LLM:', error);
                if (
                    popupSession.current.visible &&
                    popupSession.current.generation === generation
                ) {
                    message.error('Could not save LLM selection. It may reset after restart.');
                }
            }
        });
        selectionSave.current = save;
        void save.finally(() => {
            if (selectionSave.current === save) setSelectionSaving(false);
        });
    };

    const enabledLLMs = llmConfigs.filter(llm => llm.enabled);

    const isDark =
        themeMode === 'dark' ||
        (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Get theme class name
    const getThemeClass = () => {
        if (themeMode === 'dark') return 'dark';
        if (themeMode === 'orange') return 'theme-orange';
        if (themeMode === 'skyblue') return 'theme-skyblue';
        if (themeMode === 'lightgreen') return 'theme-lightgreen';
        if (themeMode === 'high-contrast-light') return 'theme-high-contrast-light';
        if (themeMode === 'high-contrast-dark') return 'theme-high-contrast-dark';
        return '';
    };

    return (
        <ConfigProvider
            theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}
        >
            <div className={`app-container ${getThemeClass()}`}>
                {workflow === 'assistant' ? (
                    !preferencesLoaded ? (
                        <Spin tip='Loading preferences...'>
                            <div style={{ minHeight: 160 }} />
                        </Spin>
                    ) : (
                        <AssistantPopup
                            clipboardContent={clipboardContent}
                            onClose={() => {
                                // Close handler - could be implemented if needed
                            }}
                            selectedLLM={selectedLLM}
                            onLLMChange={handleLLMChange}
                            selectionSaving={selectionSaving}
                            llmConfigs={enabledLLMs}
                            actions={actions}
                        />
                    )
                ) : (
                    <SettingsDialog
                        open={true}
                        onOpenChange={() => {
                            // Open change handler - could be implemented if needed
                        }}
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
