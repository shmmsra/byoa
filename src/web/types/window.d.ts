// Type definitions for the BYOA native API and Saucer
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
      };
    };
    
    // Native callback function that C++ can call
    __nativeCallback?: (eventName: string, data: string) => void;
  }
}

export {};
