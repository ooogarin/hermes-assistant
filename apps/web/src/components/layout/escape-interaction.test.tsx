import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthProvider } from '../../app/auth/auth-context';
import { ChoiceDropdown } from '../ui/choice-dropdown';
import { AppShell } from './app-shell';

const Dropdown = () => {
  const [value, setValue] = useState<string | null>(null);

  return (
    <ChoiceDropdown
      label='Tipe'
      mode='single'
      onChange={setValue}
      options={[{ label: 'Fact', value: 'fact' }]}
      placeholder='Semua tipe'
      value={value}
    />
  );
};

const Harness = () => (
  <MemoryRouter initialEntries={['/']}>
    <AuthProvider>
      <AppShell />
      <Dropdown />
    </AuthProvider>
  </MemoryRouter>
);

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { authenticated: true, expires_at: new Date(Date.now() + 3_600_000).toISOString() },
        }),
        { status: 200 },
      ),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('escape inside a dropdown', () => {
  test('closes the dropdown without touching the navigation drawer', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => {
      expect(screen.queryByText('Memeriksa akses…')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Buka navigasi' }));
    const drawer = screen.getByRole('dialog', { name: 'Navigasi' });

    await user.click(screen.getByRole('button', { name: 'Buka tipe' }));
    expect(screen.getByRole('listbox', { name: 'Tipe' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox', { name: 'Tipe' })).not.toBeInTheDocument();
    expect(drawer).toBeInTheDocument();
  });
});
