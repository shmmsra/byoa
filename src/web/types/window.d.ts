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
        clipboard_writeText(text: string): Promise<boolean>;
        clipboard_clear(): Promise<void>;
        vault_getData(key: string): Promise<string>;
        vault_setData(key: string, value: string): Promise<boolean>;
        vault_deleteData(key: string): Promise<boolean>;
        vault_hasData(key: string): Promise<boolean>;
        network_fetch(url: string, options: string): Promise<string>;
        event_trigger(eventName: string, data: string): Promise<void>;
      };
    };
    
    // Native callback function that C++ can call
    __nativeCallback?: (eventName: string, data: string) => void;
  }
}

export type { NetworkFetchOptions, NetworkFetchResponse };
