import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { message } from 'antd';
import App from '../app';
import { VaultUtils } from '../utils/vault';
import type { LLMConfig } from '../app';
import { events } from '../utils/events';
import { ClipboardUtils } from '../utils/clipboard';

vi.mock('../components/assistant-popup', () => ({
    AssistantPopup: ({
        selectedLLM,
        onLLMChange,
        selectionSaving,
    }: {
        selectedLLM: string;
        onLLMChange: (value: string) => void;
        selectionSaving: boolean;
    }) => (
        <div>
            <span data-testid='selection'>{selectedLLM}</span>
            <button disabled={selectionSaving} onClick={() => onLLMChange('config-1')}>
                Choose model
            </button>
        </div>
    ),
}));
vi.mock('../components/settings-dialog', () => ({ SettingsDialog: () => <div>Settings</div> }));

const configs: LLMConfig[] = [
    { id: 'config-1', name: 'One', modelName: 'model', baseURL: '', apiKey: '', enabled: true },
    { id: 'disabled', name: 'Two', modelName: 'model', baseURL: '', apiKey: '', enabled: false },
];

beforeEach(() => {
    window.history.replaceState({}, '', '/?workflow=assistant');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    vi.spyOn(VaultUtils, 'loadLLMConfigs').mockResolvedValue(configs);
    vi.spyOn(VaultUtils, 'hasLLMConfigs').mockResolvedValue(true);
    vi.spyOn(VaultUtils, 'loadActions').mockResolvedValue([]);
    vi.spyOn(VaultUtils, 'hasActions').mockResolvedValue(true);
    vi.spyOn(VaultUtils, 'loadTheme').mockResolvedValue('auto');
    vi.spyOn(VaultUtils, 'hasTheme').mockResolvedValue(true);
    vi.spyOn(VaultUtils, 'saveSelectedLLM').mockResolvedValue();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('restoring the selected LLM', () => {
    it.each([
        ['config-1', 'config-1'],
        ['all', 'all'],
        ['auto', 'auto'],
        ['missing', 'auto'],
        ['disabled', 'auto'],
    ])('restores %s as %s', async (saved, expected) => {
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockResolvedValue(saved);
        render(<App />);
        expect((await screen.findByTestId('selection')).textContent).toBe(expected);
        expect(VaultUtils.saveSelectedLLM).not.toHaveBeenCalled();
    });

    it('waits for restoration before allowing interaction', async () => {
        let resolveSelection!: (value: string) => void;
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockReturnValue(
            new Promise(resolve => {
                resolveSelection = resolve;
            }),
        );
        render(<App />);
        expect(screen.queryByRole('button', { name: 'Choose model' })).toBeNull();
        expect(screen.getByText('Loading preferences...')).toBeTruthy();
        await act(async () => resolveSelection('config-1'));
        expect((await screen.findByTestId('selection')).textContent).toBe('config-1');
    });

    it('persists user changes and restores them on a fresh mount', async () => {
        let saved = 'auto';
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockImplementation(async () => saved);
        vi.spyOn(VaultUtils, 'saveSelectedLLM').mockImplementation(async value => {
            saved = value;
        });
        const view = render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: 'Choose model' }));
        await waitFor(() => expect(saved).toBe('config-1'));
        view.unmount();
        render(<App />);
        expect((await screen.findByTestId('selection')).textContent).toBe('config-1');
    });

    it('reports persistence failure without losing the current selection', async () => {
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockResolvedValue('auto');
        vi.spyOn(VaultUtils, 'saveSelectedLLM').mockRejectedValue(new Error('write failed'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const toast = vi
            .spyOn(message, 'error')
            .mockImplementation(() => Object.assign(() => {}, { then: vi.fn() }));
        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: 'Choose model' }));
        await waitFor(() => expect(toast).toHaveBeenCalled());
        expect(screen.getByTestId('selection').textContent).toBe('config-1');
    });

    it('does not load or overwrite the preference from the settings window', async () => {
        window.history.replaceState({}, '', '/');
        const load = vi.spyOn(VaultUtils, 'loadSelectedLLM');
        render(<App />);
        await screen.findByText('Settings');
        expect(load).not.toHaveBeenCalled();
        expect(VaultUtils.saveSelectedLLM).not.toHaveBeenCalled();
    });

    it('forwards native hide notifications and clears messages', async () => {
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockResolvedValue('auto');
        const destroy = vi.spyOn(message, 'destroy').mockImplementation(() => {});
        const listener = vi.fn();
        const unsubscribe = events.on('assistant:visibility-changed', listener);
        render(<App />);
        await screen.findByTestId('selection');
        act(() => window.__nativeCallback?.('on-focus-change', 'false'));
        expect(listener).toHaveBeenCalledWith({ visible: false });
        expect(destroy).toHaveBeenCalled();
        unsubscribe();
    });

    it('falls back when the selected configuration is removed while running', async () => {
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockResolvedValue('config-1');
        render(<App />);
        expect((await screen.findByTestId('selection')).textContent).toBe('config-1');
        vi.mocked(VaultUtils.loadLLMConfigs).mockResolvedValue([]);
        await act(async () => events.emit('settings:llm-configs-changed', { configs: [] }));
        expect(screen.getByTestId('selection').textContent).toBe('auto');
    });

    it('does not show a late save-failure toast in the next opening', async () => {
        vi.spyOn(VaultUtils, 'loadSelectedLLM').mockResolvedValue('auto');
        let rejectSave!: (reason: Error) => void;
        vi.spyOn(VaultUtils, 'saveSelectedLLM').mockReturnValue(
            new Promise((_resolve, reject) => {
                rejectSave = reject;
            }),
        );
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const toast = vi
            .spyOn(message, 'error')
            .mockImplementation(() => Object.assign(() => {}, { then: vi.fn() }));
        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: 'Choose model' }));
        await act(async () => window.__nativeCallback?.('on-focus-change', 'false'));
        vi.spyOn(ClipboardUtils, 'readData').mockResolvedValue([]);
        await act(async () => {
            window.__nativeCallback?.('on-focus-change', 'true');
            rejectSave(new Error('late write failure'));
        });
        expect(toast).not.toHaveBeenCalled();
    });
});
