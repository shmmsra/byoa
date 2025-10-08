// Type definitions for the BYOA native API and Saucer

interface NetworkFetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

interface NetworkFetchResponse {
    status: number;
    statusText: string;
    ok: boolean;
    headers: Record<string, string>;
    body: string;
}

declare global {
    interface Window {
        // Saucer API
        saucer?: {
            exposed: {
                clipboard_readText(): Promise<string>;
                clipboard_writeText(_text: string): Promise<boolean>;
                clipboard_clear(): Promise<void>;
                vault_getData(_key: string): Promise<string>;
                vault_setData(_key: string, _value: string): Promise<boolean>;
                vault_deleteData(_key: string): Promise<boolean>;
                vault_hasData(_key: string): Promise<boolean>;
                network_fetch(_url: string, _options: string): Promise<string>;
                event_trigger(_eventName: string, _data: string): Promise<void>;
            };
        };

        // Native callback function that C++ can call
        __nativeCallback?: (_eventName: string, _data: string) => void;
    }
}

export type { NetworkFetchOptions, NetworkFetchResponse };
