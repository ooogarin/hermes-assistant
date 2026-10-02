import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AppRoutes } from '../routes';
import { AuthProvider } from './auth-context';

const success = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const unauthorized = () =>
  new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Unauthorized' } }), {
    status: 401,
  });
const status = { authenticated: true, expires_at: new Date(Date.now() + 3_600_000).toISOString() };

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('personal web auth', () => {
  test('asks for a password and clears an incorrect one for retry', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => {
        if (path === '/api/v1/auth/login') {
          return new Response(
            JSON.stringify({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }),
            { status: 401 },
          );
        }

        return unauthorized();
      }),
    );

    renderAt('/login');
    const input = await screen.findByLabelText('Kata sandi');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(screen.getByText('Masukkan kata sandi.', { selector: '#login-password-error' })).toBeInTheDocument();
    expect(input).toHaveFocus();

    await user.type(input, 'incorrect');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(
      await screen.findByText('Kata sandi tidak sesuai. Coba lagi.', { selector: '#login-password-error' }),
    ).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  test('blocks private content, signs in with the exact password, and confirms the cookie', async () => {
    const user = userEvent.setup();
    let statusCalls = 0;
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/v1/auth/status') {
        statusCalls += 1;
        return statusCalls === 1 ? unauthorized() : success(status);
      }

      if (path === '/api/v1/auth/login') {
        return success(status);
      }

      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Selamat datang kembali' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ringkasan' })).not.toBeInTheDocument();

    const input = screen.getByLabelText('Kata sandi');
    await user.type(input, '  secret  ');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));

    expect(await screen.findByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();
    expect(statusCalls).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ body: JSON.stringify({ password: '  secret  ' }), credentials: 'same-origin' }),
    );
  });

  test('logout clears the protected UI and returns to login', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/v1/auth/status') {
        return success(status);
      }

      if (path === '/api/v1/auth/logout') {
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keluar' }));

    expect(await screen.findByRole('heading', { name: 'Selamat datang kembali' })).toBeInTheDocument();
    expect(screen.getByText('Kamu sudah keluar.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({ method: 'POST' }));
  });

  test('a domain 401 removes private content and shows the expired notice', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => (path === '/api/v1/auth/status' ? success(status) : unauthorized())),
    );

    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Finance' }));

    expect(await screen.findByRole('heading', { name: 'Selamat datang kembali' })).toBeInTheDocument();
    expect(screen.getByText('Sesi berakhir. Masuk lagi untuk melanjutkan.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Finance' })).not.toBeInTheDocument();
  });
});
