import { afterEach, describe, expect, it, vi } from 'vitest';
import { VaultUtils } from '../utils/vault';

afterEach(() => vi.unstubAllGlobals());

describe('selected LLM preference', () => {
    it.each(['auto', 'all', 'config-1'])('loads saved selection %s', async selection => {
        vi.stubGlobal('saucer', {
            exposed: { vault_getData: vi.fn().mockResolvedValue(JSON.stringify(selection)) },
        });
        expect(await VaultUtils.loadSelectedLLM()).toBe(selection);
    });

    it.each(['', 'null', '12', '{}', '""', 'invalid-json'])(
        'falls back to auto for missing or invalid data %s',
        async data => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.stubGlobal('saucer', {
                exposed: { vault_getData: vi.fn().mockResolvedValue(data) },
            });
            expect(await VaultUtils.loadSelectedLLM()).toBe('auto');
        },
    );

    it('logs read failures and falls back to auto', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.stubGlobal('saucer', {
            exposed: { vault_getData: vi.fn().mockRejectedValue(new Error('read failed')) },
        });
        expect(await VaultUtils.loadSelectedLLM()).toBe('auto');
        expect(log).toHaveBeenCalled();
    });

    it('saves using the existing native vault API', async () => {
        const save = vi.fn().mockResolvedValue(true);
        vi.stubGlobal('saucer', { exposed: { vault_setData: save } });
        await VaultUtils.saveSelectedLLM('config-1');
        expect(save).toHaveBeenCalledWith('selected_llm', '"config-1"');
    });

    it.each([false, new Error('write failed')])('surfaces save failure %s', async result => {
        const save =
            result instanceof Error
                ? vi.fn().mockRejectedValue(result)
                : vi.fn().mockResolvedValue(result);
        vi.stubGlobal('saucer', { exposed: { vault_setData: save } });
        await expect(VaultUtils.saveSelectedLLM('config-1')).rejects.toThrow();
    });

    it('handles unavailable storage explicitly', async () => {
        vi.stubGlobal('saucer', undefined);
        const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(await VaultUtils.loadSelectedLLM()).toBe('auto');
        expect(log).toHaveBeenCalled();
        await expect(VaultUtils.saveSelectedLLM('all')).rejects.toThrow();
    });
});
