import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import packageJson from '../../../package.json';
import { SettingsDialog } from '../components/settings-dialog';
import { AppInfoUtils } from '../utils/app-info';

describe('SettingsDialog About tab', () => {
    it('shows the app icon, package version, executable path, and license', async () => {
        vi.spyOn(AppInfoUtils, 'getExecutablePath').mockResolvedValue(
            '/Applications/BYOAssistant.app/Contents/MacOS/BYOAssistant',
        );

        render(
            <SettingsDialog
                open={true}
                onOpenChange={vi.fn()}
                llmConfigs={[]}
                onLLMConfigsChange={vi.fn()}
                actions={[]}
                onActionsChange={vi.fn()}
                theme='auto'
                onThemeChange={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('tab', { name: 'About' }));

        expect(await screen.findByText(`Version ${packageJson.version}`)).toBeTruthy();
        expect(
            await screen.findByText('/Applications/BYOAssistant.app/Contents/MacOS/BYOAssistant'),
        ).toBeTruthy();
        expect(screen.getByText('MIT')).toBeTruthy();
        expect(screen.getByRole('img', { name: 'BYOA app icon' })).toBeTruthy();
    });
});
