export interface ClipboardData {
    type: 'text' | 'image';
    data: string | Blob;
}

export class ClipboardUtils {
  private static _cache: ClipboardData = {
    type: 'text',
    data: '',
  };

  /**
     * Read data from clipboard
     * Returns an array of clipboard items or null if no data available
     */
  static async readData(): Promise<ClipboardData[] | null> {
    try {
      // Use our native clipboard API if available, fallback to browser API
      if (window.saucer?.exposed?.clipboard_readText) {
        const text = await window.saucer.exposed.clipboard_readText();
        if (!text || (this._cache.type === 'text' && this._cache.data === text)) {
          return [this._cache];
        }
        this._cache = {
          type: 'text',
          data: text,
        };
        return [this._cache];
      } else {
        // Fallback to browser clipboard API
        const clipboardContents = await navigator.clipboard.read();
        for (const item of clipboardContents) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              return [
                {
                  type: 'image',
                  data: blob,
                },
              ];
            } else if (type.startsWith('text/plain')) {
              const blob = await item.getType(type);
              const text = await blob.text();
              return [
                {
                  type: 'text',
                  data: text,
                },
              ];
            }
          }
        }
      }
    } catch (error) {
      console.error('Error reading clipboard data:', error);
    }
    return null;
  }

  /**
     * Write text to clipboard
     * Returns true if successful, false otherwise
     */
  static async writeText(text: string): Promise<boolean> {
    try {
      // Use our native clipboard API if available, fallback to browser API
      if (window.saucer?.exposed?.clipboard_writeText) {
        await window.saucer.exposed.clipboard_writeText(text);
        return true;
      } else {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.error('Error writing text to clipboard:', error);
      return false;
    }
  }

  /**
     * Write blob data to clipboard
     * Returns true if successful, false otherwise
     */
  static async writeBlob(blob: Blob, type: string): Promise<boolean> {
    try {
      // Use browser clipboard API for blob data
      const clipboardItem = new ClipboardItem({ [type]: blob });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    } catch (error) {
      console.error('Error writing blob to clipboard:', error);
      return false;
    }
  }

  /**
     * Check if clipboard API is available
     */
  static isAvailable(): boolean {
    return !!(window.saucer?.exposed?.clipboard_readText || navigator.clipboard);
  }

  /**
     * Get cached clipboard data
     */
  static getCachedData(): ClipboardData {
    return this._cache;
  }

  /**
     * Clear cached clipboard data
     */
  static clearCache(): void {
    this._cache = {
      type: 'text',
      data: '',
    };
  }
}
