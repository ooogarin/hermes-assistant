import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { confirmDiscardChanges } from '../../lib/hooks/use-unsaved-changes';
import { LearningSettingsPage } from './learning-settings';

const settings = {
  defaultLevel: 'A1',
  defaultWordCount: 300,
  maxWordCount: 350,
  minWordCount: 250,
  updatedAt: '2026-09-06T10:00:00.000Z',
};

const renderSettings = () =>
  render(
    <MemoryRouter>
      <LearningSettingsPage
        feature='Reading'
        getSettings={async () => settings}
        lengthLabel='Target panjang'
        updateSettings={async () => settings}
      />
    </MemoryRouter>,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('warns before leaving a settings page that has unsaved changes', async () => {
  const user = userEvent.setup();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  renderSettings();

  await user.click(await screen.findByRole('button', { name: 'A2' }));

  expect(confirmDiscardChanges()).toBe(false);
  expect(confirm).toHaveBeenCalledWith('Perubahan belum disimpan. Tetap kembali?');
});

test('lets the reader leave a settings page that has no changes', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  renderSettings();

  await screen.findByRole('button', { name: 'A1' });

  expect(confirmDiscardChanges()).toBe(true);
});
