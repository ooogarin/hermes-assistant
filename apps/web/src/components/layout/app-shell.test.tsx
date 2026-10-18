import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthProvider } from '../../app/auth/auth-context';
import { AppShell } from './app-shell';

const sidebarStorageKey = 'hermes-sidebar-expanded';

const renderShell = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MemoryRouter>,
  );

const queryTooltip = () => document.querySelector('.sidebar-tooltip');

beforeEach(() => {
  window.localStorage.clear();
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

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('sidebar rail tooltips', () => {
  test('shows the menu name on hover while the sidebar is collapsed', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    const user = userEvent.setup();
    renderShell();

    await user.hover(await screen.findByRole('link', { name: 'Finance' }));

    await waitFor(() => expect(queryTooltip()).toHaveTextContent('Finance'));
  });

  test('keeps the tooltip hidden while the sidebar is expanded', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'true');
    const user = userEvent.setup();
    renderShell();

    const finance = await screen.findByRole('link', { name: 'Finance' });
    await user.hover(finance);
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(queryTooltip()).toBeNull();
  });

  test('shows the tooltip immediately on keyboard focus', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    const user = userEvent.setup();
    renderShell();

    await user.tab();

    expect(queryTooltip()).toHaveTextContent('Buka sidebar');

    await user.tab();

    expect(queryTooltip()).toHaveTextContent('Ringkasan');
  });

  test('hides the tooltip on Escape', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    const user = userEvent.setup();
    renderShell();

    await user.tab();
    expect(queryTooltip()).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(queryTooltip()).toBeNull();
  });

  test('labels submenu children with their own names', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    const user = userEvent.setup();
    renderShell('/english/grammar');

    await user.hover(await screen.findByRole('link', { name: 'Grammar' }));

    await waitFor(() => expect(queryTooltip()).toHaveTextContent('Grammar'));
  });

  test('labels the logout action', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    const user = userEvent.setup();
    renderShell();

    await user.hover(await screen.findByRole('button', { name: 'Keluar' }));

    await waitFor(() => expect(queryTooltip()).toHaveTextContent('Keluar'));
  });

  test('drops the tooltip when the sidebar expands', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    const user = userEvent.setup();
    renderShell();

    await user.hover(await screen.findByRole('link', { name: 'Finance' }));
    await waitFor(() => expect(queryTooltip()).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'Buka sidebar' }));

    expect(queryTooltip()).toBeNull();
  });

  test('keeps the toggle inside the brand row and marks the sidebar state', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'false');
    renderShell();

    const toggle = await screen.findByRole('button', { name: 'Buka sidebar' });
    const brandRow = document.querySelector('.sidebar-brand');

    expect(brandRow).toContainElement(toggle);
    expect(document.querySelector('.app-sidebar')).toHaveAttribute('data-expanded', 'false');
    expect(toggle).toHaveClass('sidebar-toggle');
  });

  test('offers the collapse action while the sidebar is expanded', async () => {
    window.localStorage.setItem(sidebarStorageKey, 'true');
    const user = userEvent.setup();
    renderShell();

    const toggle = await screen.findByRole('button', { name: 'Ciutkan sidebar' });

    expect(document.querySelector('.app-sidebar')).toHaveAttribute('data-expanded', 'true');

    await user.hover(toggle);

    await waitFor(() => expect(queryTooltip()).toHaveTextContent('Ciutkan sidebar'));
  });
});
