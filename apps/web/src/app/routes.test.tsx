import { render, screen } from '@testing-library/react';
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
});
