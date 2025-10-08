/**
 * Event system for inter-component communication in BYOA
 * Handles communication between SettingsDialog and AssistantPopup components
 * across separate webviews using native APIs
 */

export type EventData = Record<string, any>;

export type EventListener = (data: EventData) => void;

export interface EventMap {
    'settings:theme-changed': {
        theme:
            | 'auto'
            | 'light'
            | 'dark'
            | 'orange'
            | 'skyblue'
            | 'lightgreen'
            | 'high-contrast-light'
            | 'high-contrast-dark';
    };
    'settings:llm-configs-changed': { configs: any[] };
    'settings:actions-changed': { actions: any[] };
    'settings:llm-enabled-changed': { llmId: string; enabled: boolean };
    'settings:action-enabled-changed': { actionId: string; enabled: boolean };
    'assistant:request-refresh': { reason: string };
    'assistant:clipboard-changed': { content: string };
}

export type EventName = keyof EventMap;

/**
 * Centralized event system for BYOA components
 * Uses native APIs to communicate between separate webviews
 */
class Events {
    private static instance: Events;
    private listeners = new Map<EventName, Set<EventListener>>();
    private isInitialized = false;

    private constructor() {}

    /**
     * Get singleton instance
     */
    static getInstance(): Events {
        if (!Events.instance) {
            Events.instance = new Events();
        }
        return Events.instance;
    }

    /**
     * Initialize the event system
     * Note: Native callback handler should be set up in the app component
     */
    initialize(): void {
        if (this.isInitialized) {
            return;
        }

        this.isInitialized = true;
        console.log('Events system initialized');
    }

    /**
     * Handle events from native code
     */
    handleNativeEvent(eventName: string, data: string): void {
        try {
            console.log(`[Events] Received native event: ${eventName}`);
            console.log('[Events] Raw data:', data);
            console.log('[Events] Data type:', typeof data);
            console.log('[Events] Data length:', data?.length);

            let parsedData = {};

            if (data && data.trim() !== '') {
                try {
                    parsedData = JSON.parse(data);
                } catch (parseError) {
                    console.error('[Events] JSON parse failed for data:', data);
                    console.error('[Events] Parse error:', parseError);

                    // Try to handle escaped JSON (from native code escaping)
                    try {
                        // The native code escapes quotes and backslashes for JavaScript execution
                        // So we need to unescape them
                        let cleanedData = data;

                        // Unescape quotes: \" -> "
                        cleanedData = cleanedData.replace(/\\"/g, '"');

                        // Unescape backslashes: \\ -> \ (but be careful not to break escaped quotes)
                        cleanedData = cleanedData.replace(/\\\\/g, '\\');

                        // Unescape newlines and other characters
                        cleanedData = cleanedData.replace(/\\n/g, '\n');
                        cleanedData = cleanedData.replace(/\\r/g, '\r');
                        cleanedData = cleanedData.replace(/\\t/g, '\t');

                        console.log('[Events] Trying cleaned data:', cleanedData);
                        parsedData = JSON.parse(cleanedData);
                    } catch (secondError) {
                        console.error('[Events] Second parse attempt failed:', secondError);

                        // Try one more approach - maybe the data is just a simple string
                        try {
                            if (data.startsWith('"') && data.endsWith('"')) {
                                // It might be a quoted string
                                parsedData = { value: data.slice(1, -1) };
                            } else {
                                // If all parsing fails, use the raw data as a string
                                parsedData = { rawData: data };
                            }
                        } catch (thirdError) {
                            console.error('[Events] Third parse attempt failed:', thirdError);
                            parsedData = { rawData: data };
                        }
                    }
                }
            }

            console.log('[Events] Parsed data:', parsedData);
            this.emit(eventName as EventName, parsedData);
        } catch (error) {
            console.error('[Events] Failed to handle native event:', error);
            console.error('[Events] Event name:', eventName);
            console.error('[Events] Data:', data);
        }
    }

    /**
     * Emit an event to all listeners
     */
    emit<T extends EventName>(eventName: T, data: EventMap[T]): void {
        console.log(
            `[Events] Emitting event: ${eventName} to ${
                this.listeners.get(eventName)?.size || 0
            } listeners`
        );
        const eventListeners = this.listeners.get(eventName);
        if (eventListeners) {
            let listenerIndex = 0;
            eventListeners.forEach(listener => {
                try {
                    listenerIndex++;
                    console.log(
                        `[Events] Calling listener ${listenerIndex}/${eventListeners.size} for ${eventName}`
                    );
                    listener(data);
                } catch (error) {
                    console.error(`[Events] Error in event listener for ${eventName}:`, error);
                }
            });
        } else {
            console.log(`[Events] No listeners found for event: ${eventName}`);
        }
    }

    /**
     * Subscribe to an event
     */
    on<T extends EventName>(eventName: T, listener: EventListener): () => void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        this.listeners.get(eventName)!.add(listener);

        // Return unsubscribe function
        return () => {
            const eventListeners = this.listeners.get(eventName);
            if (eventListeners) {
                eventListeners.delete(listener);
                if (eventListeners.size === 0) {
                    this.listeners.delete(eventName);
                }
            }
        };
    }

    /**
     * Unsubscribe from an event
     */
    off<T extends EventName>(eventName: T, listener: EventListener): void {
        const eventListeners = this.listeners.get(eventName);
        if (eventListeners) {
            eventListeners.delete(listener);
            if (eventListeners.size === 0) {
                this.listeners.delete(eventName);
            }
        }
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first call)
     */
    once<T extends EventName>(eventName: T, listener: EventListener): () => void {
        const onceListener = (data: EventData) => {
            listener(data);
            this.off(eventName, onceListener);
        };

        return this.on(eventName, onceListener);
    }

    /**
     * Trigger an event to other webviews via native API
     * This is used to communicate between SettingsDialog and AssistantPopup
     */
    triggerToOtherWebview<T extends EventName>(eventName: T, data: EventMap[T]): void {
        try {
            console.log(`[Events] Triggering event: ${eventName}`);
            console.log('[Events] Event data:', data);

            const jsonData = JSON.stringify(data);
            console.log('[Events] JSON string:', jsonData);
            console.log('[Events] JSON length:', jsonData.length);

            // Use saucer's event trigger API if available
            if (window.saucer?.exposed?.event_trigger) {
                console.log('[Events] Using saucer event_trigger API');
                window.saucer.exposed.event_trigger(eventName, jsonData);
            } else {
                console.warn('[Events] event_trigger API not available');
                console.log(
                    '[Events] Available saucer APIs:',
                    Object.keys(window.saucer?.exposed || {})
                );
            }
        } catch (error) {
            console.error('[Events] Failed to trigger event to other webview:', error);
        }
    }

    /**
     * Get all active listeners for debugging
     */
    getActiveListeners(): Record<string, number> {
        const result: Record<string, number> = {};
        this.listeners.forEach((listeners, eventName) => {
            result[eventName] = listeners.size;
        });
        return result;
    }

    /**
     * Clear all listeners (useful for cleanup)
     */
    clearAll(): void {
        this.listeners.clear();
    }
}

// Export singleton instance
const events = Events.getInstance();

// Add debug functions to window for testing
if (typeof window !== 'undefined') {
    (window as any).testEvents = {
        trigger: (eventName: string, data: any) => {
            console.log('[Test] Triggering event:', eventName, data);
            events.triggerToOtherWebview(eventName as any, data);
        },
        listen: (eventName: string, callback: (data: any) => void) => {
            console.log('[Test] Listening for event:', eventName);
            return events.on(eventName as any, callback);
        },
        getListeners: () => {
            console.log('[Test] Active listeners:', events.getActiveListeners());
            return events.getActiveListeners();
        },
        testThemeChange: () => {
            events.triggerToOtherWebview('settings:theme-changed', { theme: 'dark' });
        },
        testLLMChange: () => {
            events.triggerToOtherWebview('settings:llm-configs-changed', {
                configs: [{ id: 'test', name: 'Test LLM', enabled: true }],
            });
        },
        testJSONParsing: (testData: string) => {
            console.log('[Test] Testing JSON parsing with:', testData);
            events.handleNativeEvent('test-event', testData);
        },
    };
}

export { events };
export default events;
