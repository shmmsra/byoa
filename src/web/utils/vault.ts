import { LLMConfig } from '../app';

// Vault utility functions for LLM configurations
export class VaultUtils {
  private static readonly LLM_CONFIGS_KEY = 'llm_configs';

  /**
   * Load LLM configurations from the vault
   */
  static async loadLLMConfigs(): Promise<LLMConfig[]> {
    try {
      if (!window.saucer?.exposed?.vault_getData) {
        console.warn('Vault API not available, using default configs');
        return this.getDefaultConfigs();
      }

      const data = await window.saucer.exposed.vault_getData(this.LLM_CONFIGS_KEY);
      
      if (!data) {
        console.log('No LLM configs found in vault, using defaults');
        return this.getDefaultConfigs();
      }

      const configs = JSON.parse(data) as LLMConfig[];
      console.log('Loaded LLM configs from vault:', configs.length, 'configurations');
      return configs;
    } catch (error) {
      console.error('Failed to load LLM configs from vault:', error);
      return this.getDefaultConfigs();
    }
  }

  /**
   * Save LLM configurations to the vault
   */
  static async saveLLMConfigs(configs: LLMConfig[]): Promise<boolean> {
    try {
      if (!window.saucer?.exposed?.vault_setData) {
        console.warn('Vault API not available, cannot save configs');
        return false;
      }

      const data = JSON.stringify(configs);
      const success = await window.saucer.exposed.vault_setData(this.LLM_CONFIGS_KEY, data);
      
      if (success) {
        console.log('Successfully saved LLM configs to vault');
      } else {
        console.error('Failed to save LLM configs to vault');
      }
      
      return success;
    } catch (error) {
      console.error('Error saving LLM configs to vault:', error);
      return false;
    }
  }

  /**
   * Check if LLM configurations exist in the vault
   */
  static async hasLLMConfigs(): Promise<boolean> {
    try {
      if (!window.saucer?.exposed?.vault_hasData) {
        return false;
      }

      return await window.saucer.exposed.vault_hasData(this.LLM_CONFIGS_KEY);
    } catch (error) {
      console.error('Error checking for LLM configs in vault:', error);
      return false;
    }
  }

  /**
   * Delete LLM configurations from the vault
   */
  static async deleteLLMConfigs(): Promise<boolean> {
    try {
      if (!window.saucer?.exposed?.vault_deleteData) {
        console.warn('Vault API not available, cannot delete configs');
        return false;
      }

      const success = await window.saucer.exposed.vault_deleteData(this.LLM_CONFIGS_KEY);
      
      if (success) {
        console.log('Successfully deleted LLM configs from vault');
      } else {
        console.error('Failed to delete LLM configs from vault');
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting LLM configs from vault:', error);
      return false;
    }
  }

  /**
   * Get default LLM configurations (fallback when vault is empty)
   */
  private static getDefaultConfigs(): LLMConfig[] {
    return [];
  }

  /**
   * Migrate from hardcoded configs to vault (one-time operation)
   */
  static async migrateToVault(currentConfigs: LLMConfig[]): Promise<void> {
    try {
      const hasConfigs = await this.hasLLMConfigs();
      
      if (!hasConfigs && currentConfigs.length > 0) {
        console.log('Migrating existing LLM configs to vault...');
        await this.saveLLMConfigs(currentConfigs);
      }
    } catch (error) {
      console.error('Error during vault migration:', error);
    }
  }
}
