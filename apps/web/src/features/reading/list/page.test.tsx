import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import ReadingListPage from './page';

const listItem = {
  code: 'RD-20260908-001',
  title: 'A reading material',
  content_excerpt: 'An excerpt.',
  genre: 'science',
  level: 'B1',
  tags: ['science'],
  reading_status: 'unread' as const,
  created_at: '2026-09-08T09:00:00.000Z',
};

const mockResponse = (data: unknown) => {
  const fetch = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify({ success: true, data }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let currentSearch = '';

const LocationProbe = () => {
  currentSearch = useLocation().search;
  return null;
};

const renderListPage = (initialEntry = '/english/reading', items: unknown[] = [listItem]) => {
  const fetch = mockResponse({ items });

  const view = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path='/english/reading' element={<ReadingListPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

  return { fetch, ...view };
};

const readSearch = () => new URLSearchParams(currentSearch);

test('keeps the browser URL as the source of truth for the applied filters', async () => {
  const user = userEvent.setup();
  const { fetch } = renderListPage();

  await user.type(screen.getByRole('textbox', { name: 'Cari bacaan' }), 'jam');
  await user.click(screen.getByRole('button', { name: 'Cari' }));

  expect(readSearch().get('q')).toBe('jam');

  await user.click(screen.getByRole('button', { name: 'Belum dibaca' }));

  expect(readSearch().get('reading_status')).toBe('unread');
  expect(readSearch().get('q')).toBe('jam');

  const requested = fetch.mock.calls.at(-1)?.[0] as string;
  expect(requested).toContain('q=jam');
  expect(requested).toContain('reading_status=unread');
});

test('reads the applied filters from the URL on the first render', () => {
  const { fetch } = renderListPage('/english/reading?q=jam&reading_status=read&sort=oldest');

  expect(readSearch().get('q')).toBe('jam');
  expect(screen.getByRole('button', { name: 'Urutkan: Terlama' })).toBeInTheDocument();

  const requested = fetch.mock.calls.at(-1)?.[0] as string;
  expect(requested).toContain('q=jam');
  expect(requested).toContain('reading_status=read');
  expect(requested).toContain('sort=oldest');
});

test('keeps a pending filter draft while the search query is applied', async () => {
  const user = userEvent.setup();
  renderListPage();

  await user.type(screen.getByRole('textbox', { name: 'Cari bacaan' }), 'jam');
  await user.click(screen.getByRole('button', { name: 'Filter' }));
  await user.type(screen.getByRole('textbox', { name: 'Genre' }), 'fantasy');

  await user.click(screen.getByRole('button', { name: 'Cari' }));

  expect(readSearch().get('q')).toBe('jam');

  await user.click(screen.getByRole('button', { name: 'Filter' }));

  expect(screen.getByRole('textbox', { name: 'Genre' })).toHaveValue('fantasy');
});

test('applies a filter draft to the URL', async () => {
  const user = userEvent.setup();
  const { fetch } = renderListPage();

  await user.click(screen.getByRole('button', { name: 'Filter' }));
  await user.type(screen.getByRole('textbox', { name: 'Genre' }), 'fantasy');
  await user.click(screen.getByRole('button', { name: 'Terapkan' }));

  expect(readSearch().get('genre')).toBe('fantasy');

  const requested = fetch.mock.calls.at(-1)?.[0] as string;
  expect(requested).toContain('genre=fantasy');
});

test('clears every applied filter on request', async () => {
  const user = userEvent.setup();
  renderListPage('/english/reading?q=jam&reading_status=read', []);

  await user.click(await screen.findByRole('button', { name: 'Hapus filter' }));

  expect(currentSearch).toBe('');
});
