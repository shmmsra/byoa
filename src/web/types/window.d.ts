// Type definitions for the BYOA native API and Saucer
declare global {
  interface Window {
    // Saucer API
    saucer?: {
      exposed: {
        clipboard_readText(): Promise<string>;
        clipboard_writeText(text: string): Promise<boolean>;
        clipboard_clear(): Promise<void>;
      };
    };
    
    // Native callback function that C++ can call
    __nativeCallback?: (eventName: string, data: string) => void;
  }
}

export {};
