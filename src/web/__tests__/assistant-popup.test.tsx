import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { message } from 'antd';
import { AssistantPopup } from '../components/assistant-popup';
import { InvokeLLM } from '../utils/llm';
import { ClipboardUtils } from '../utils/clipboard';
import { HistoryUtils } from '../utils/history';
import { events } from '../utils/events';

vi.mock('../utils/llm', () => ({ InvokeLLM: vi.fn() }));
vi.mock('../components/diff-viewer', () => ({
    DiffViewer: () => <div>Diff</div>,
}));

const props = {
    clipboardContent: 'Clipboard text',
    onClose: vi.fn(),
    selectedLLM: 'auto',
    onLLMChange: vi.fn(),
    llmConfigs: [
        {
            id: 'one',
            name: 'One',
            modelName: 'model',
            baseURL: 'http://localhost',
            apiKey: 'test',
            enabled: true,
        },
    ],
    actions: [{ id: 'fix', label: 'Fix', prompt: 'Fix text', enabled: true }],
};

beforeEach(() => {
    vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
            matches: false,
            addListener: vi.fn(),
            removeListener: vi.fn(),
        }),
    );
    vi.spyOn(HistoryUtils, 'saveEntry').mockResolvedValue(true);
    vi.spyOn(message, 'destroy').mockImplementation(() => {});
    vi.spyOn(message, 'error').mockImplementation(() => Object.assign(() => {}, { then: vi.fn() }));
    vi.spyOn(message, 'success').mockImplementation(() =>
        Object.assign(() => {}, { then: vi.fn() }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('popup toast lifecycle', () => {
    it('destroys toasts when hidden and on unmount', () => {
        const view = render(<AssistantPopup {...props} />);
        act(() => events.emit('assistant:visibility-changed', { visible: false }));
        expect(message.destroy).toHaveBeenCalledTimes(1);
        view.unmount();
        expect(message.destroy).toHaveBeenCalledTimes(2);
    });

    it.each([false, true])('suppresses a previous opening error (reopened: %s)', async reopened => {
        let rejectRequest!: (reason: Error) => void;
        vi.mocked(InvokeLLM).mockReturnValue(
            new Promise((_resolve, reject) => {
                rejectRequest = reject;
            }),
        );
        render(<AssistantPopup {...props} />);
        fireEvent.click(screen.getByRole('button', { name: 'Fix' }));
        act(() => {
            events.emit('assistant:visibility-changed', { visible: false });
            if (reopened) events.emit('assistant:visibility-changed', { visible: true });
        });
        await act(async () => rejectRequest(new Error('late failure')));
        expect(message.error).not.toHaveBeenCalled();
        expect(HistoryUtils.saveEntry).toHaveBeenCalled();
    });

    it('still shows errors from the current opening', async () => {
        vi.mocked(InvokeLLM).mockRejectedValue(new Error('current failure'));
        render(<AssistantPopup {...props} />);
        await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fix' })));
        expect(message.error).toHaveBeenCalledWith(expect.stringContaining('current failure'), 8);
    });

    it.each([true, false, new Error('copy failed')])(
        'suppresses late clipboard toasts (%s)',
        async outcome => {
            vi.mocked(InvokeLLM).mockResolvedValue('New text');
            let resolveCopy!: (value: boolean) => void;
            let rejectCopy!: (reason: Error) => void;
            vi.spyOn(ClipboardUtils, 'writeText').mockReturnValue(
                new Promise((resolve, reject) => {
                    resolveCopy = resolve;
                    rejectCopy = reject;
                }),
            );
            render(<AssistantPopup {...props} />);
            await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Fix' })));
            fireEvent.click(screen.getByTitle('Copy to clipboard'));
            act(() => {
                events.emit('assistant:visibility-changed', { visible: false });
                events.emit('assistant:visibility-changed', { visible: true });
            });
            await act(async () => {
                if (outcome instanceof Error) rejectCopy(outcome);
                else resolveCopy(outcome);
            });
            expect(message.success).not.toHaveBeenCalled();
            expect(message.error).not.toHaveBeenCalled();
        },
    );
});
