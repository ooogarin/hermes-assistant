import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthProvider } from './auth/auth-context';
import { AppRoutes } from './routes';

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

const renderRoutes = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('AppRoutes', () => {
  test('renders an honest placeholder for the root destination', async () => {
    renderRoutes('/');

    expect(await screen.findByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();
  });

  test('expands English navigation and opens a child destination', async () => {
    const user = userEvent.setup();
    renderRoutes('/');

    await user.click(await screen.findByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('link', { name: 'Reading' }));

    expect(await screen.findByRole('heading', { name: 'Reading' })).toBeInTheDocument();
  });

  test('renders a safe not-found state for an unknown route', async () => {
    renderRoutes('/unknown');

    expect(await screen.findByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
  });

  test('opens free writing from its new application route', async () => {
    renderRoutes('/english/writing/new');

    expect(await screen.findByRole('heading', { name: 'Tulis bebas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tulisanmu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan tulisan' })).toBeDisabled();
  });

  test.each([
    '/',
    '/english/general',
    '/finance',
    '/finance/new',
    '/finance/report',
    '/finance/transactions/2026-09-06/1/edit',
    '/notes',
    '/notes/new',
    '/notes/NT-20260906-001',
    '/notes/NT-20260906-001/edit',
    '/junk',
    '/junk/new',
    '/junk/JK-20260908-001',
    '/junk/JK-20260908-001/edit',
    '/english/grammar',
    '/english/grammar/settings',
    '/english/grammar/GR-20260908-001',
    '/english/grammar/GR-20260908-001/report',
    '/english/reading',
    '/english/reading/settings',
    '/english/reading/RD-20260908-001',
    '/english/reading/RD-20260908-001/expected-answers',
    '/english/writing',
    '/english/writing/settings',
    '/english/writing/new',
    '/english/writing/materials',
    '/english/writing/materials/WR-20260908-001',
    '/english/writing/submissions/WS-20260908-001',
    '/english/writing/submissions/WS-20260908-001/edit',
    '/english/writing/submissions/WS-20260908-001/feedback',
    '/english/writing/submissions/WS-20260908-001/corrected-text',
  ])('matches a page for %s', async (path) => {
    renderRoutes(path);

    await waitFor(() => {
      expect(screen.queryByText('Memeriksa akses…')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Halaman tidak ditemukan' })).not.toBeInTheDocument();
  });
});
