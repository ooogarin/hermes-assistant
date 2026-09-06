import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { AppRoutes } from './routes';

describe('AppRoutes', () => {
  test('renders an honest placeholder for the root destination', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Ringkasan' })).toBeInTheDocument();
  });

  test('expands English navigation and opens a child destination', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('link', { name: 'Reading' }));

    expect(screen.getByRole('heading', { name: 'Reading' })).toBeInTheDocument();
  });

  test('renders a safe not-found state for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeInTheDocument();
  });
});
