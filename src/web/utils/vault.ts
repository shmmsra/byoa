import { LLMConfig, Action } from '../app';

// Vault utility functions for LLM configurations and actions
export class VaultUtils {
  private static readonly LLM_CONFIGS_KEY = 'llm_configs';
  private static readonly ACTIONS_KEY = 'actions';

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

  // ===== Actions Management =====

  /**
   * Load actions from the vault
   */
  static async loadActions(): Promise<Action[]> {
    try {
      if (!window.saucer?.exposed?.vault_getData) {
        console.warn('Vault API not available, using default actions');
        return this.getDefaultActions();
      }

      const data = await window.saucer.exposed.vault_getData(this.ACTIONS_KEY);
      
      if (!data || data.trim() === '') {
        console.log('No actions found in vault, using defaults');
        return this.getDefaultActions();
      }

      const actions = JSON.parse(data) as Action[];
      console.log('Loaded actions from vault:', actions.length, 'actions');
      return actions;
    } catch (error) {
      console.error('Failed to load actions from vault:', error);
      return this.getDefaultActions();
    }
  }

  /**
   * Save actions to the vault
   */
  static async saveActions(actions: Action[]): Promise<boolean> {
    try {
      if (!window.saucer?.exposed?.vault_setData) {
        console.warn('Vault API not available, cannot save actions');
        return false;
      }

      const data = JSON.stringify(actions);
      const success = await window.saucer.exposed.vault_setData(this.ACTIONS_KEY, data);
      
      if (success) {
        console.log('Successfully saved actions to vault');
      } else {
        console.error('Failed to save actions to vault');
      }
      
      return success;
    } catch (error) {
      console.error('Error saving actions to vault:', error);
      return false;
    }
  }

  /**
   * Check if actions exist in the vault
   */
  static async hasActions(): Promise<boolean> {
    try {
      if (!window.saucer?.exposed?.vault_hasData) {
        return false;
      }

      return await window.saucer.exposed.vault_hasData(this.ACTIONS_KEY);
    } catch (error) {
      console.error('Error checking for actions in vault:', error);
      return false;
    }
  }

  /**
   * Delete actions from the vault
   */
  static async deleteActions(): Promise<boolean> {
    try {
      if (!window.saucer?.exposed?.vault_deleteData) {
        console.warn('Vault API not available, cannot delete actions');
        return false;
      }

      const success = await window.saucer.exposed.vault_deleteData(this.ACTIONS_KEY);
      
      if (success) {
        console.log('Successfully deleted actions from vault');
      } else {
        console.error('Failed to delete actions from vault');
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting actions from vault:', error);
      return false;
    }
  }

  /**
   * Get default actions (fallback when vault is empty)
   */
  private static getDefaultActions(): Action[] {
    return [
      { id: 'fix-grammar', label: 'Fix Grammar', prompt: 'Fix the grammar and spelling in the following text:\n\n{{data}}', enabled: true },
      { id: 'improve-writing', label: 'Improve Writing', prompt: 'Improve the writing quality of the following text:\n\n{{data}}', enabled: true },
      { id: 'summarize', label: 'Summarize', prompt: 'Summarize the following text:\n\n{{data}}', enabled: true },
      { id: 'translate', label: 'Translate', prompt: 'Translate the following text to English:\n\n{{data}}', enabled: true },
      { id: 'simplify', label: 'Simplify', prompt: 'Simplify the following text:\n\n{{data}}', enabled: true },
      { id: 'make-longer', label: 'Make Longer', prompt: 'Expand and make the following text longer:\n\n{{data}}', enabled: true },
      { id: 'make-shorter', label: 'Make Shorter', prompt: 'Make the following text more concise:\n\n{{data}}', enabled: true },
      { id: 'convert-to-code', label: 'Convert to Code', prompt: 'Convert the following to code:\n\n{{data}}', enabled: true },
      { id: 'explain-code', label: 'Explain Code', prompt: 'Explain what this code does:\n\n{{data}}', enabled: true },
    ];
  }
}
