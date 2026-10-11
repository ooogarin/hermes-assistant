import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { GrammarSessionTable } from '../../components/grammar/grammar-session-table';
import { getGrammarSessions } from './grammar-api';
import GrammarListPage from './list/page';

const listItems = [
  {
    code: 'GR-20261010-001',
    mode: 'practice',
    source: 'cron',
    status: 'active',
    level: 'B1',
    grammar_area: 'tenses',
    grammar_point: 'past perfect',
    question_count: 5,
    answered_question_count: 2,
    score: null,
    max_score: null,
    started_at: '2026-10-10T03:00:00.000Z',
    completed_at: null,
  },
  {
    code: 'GR-20261009-001',
    mode: 'exam',
    source: 'request',
    status: 'completed',
    level: 'B2',
    grammar_area: 'conditionals',
    grammar_point: 'conditional type 2',
    question_count: 10,
    answered_question_count: 10,
    score: 8,
    max_score: 10,
    started_at: '2026-10-09T03:00:00.000Z',
    completed_at: '2026-10-09T09:00:00.000Z',
  },
  {
    code: 'GR-20261008-001',
    mode: 'practice',
    source: 'request',
    status: 'abandoned',
    level: 'A2',
    grammar_area: null,
    grammar_point: null,
    question_count: 5,
    answered_question_count: 0,
    score: null,
    max_score: null,
    started_at: '2026-10-08T03:00:00.000Z',
    completed_at: null,
  },
];

const listMeta = { page: 1, limit: 20, total: 25, total_pages: 2 };

const mockResponse = (data: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: true, data }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
    ),
  );

const lastQuery = (): URL => new URL(String(vi.mocked(fetch).mock.lastCall?.[0]), 'http://localhost');

afterEach(() => {
  vi.unstubAllGlobals();
});

test('list request and response follow the collection contract', async () => {
  mockResponse({ items: listItems, meta: listMeta });
  const result = await getGrammarSessions({
    q: 'past perfect',
    status: 'active',
    mode: 'practice',
    level: 'B1',
    page: 2,
    limit: 20,
    sort: 'oldest',
  });
  const requestUrl = String(vi.mocked(fetch).mock.calls[0]?.[0]);

  expect(requestUrl.split('?')[0]).toBe('/api/v1/grammar/sessions');
  expect(Object.fromEntries(new URL(requestUrl, 'http://localhost').searchParams)).toEqual({
    q: 'past perfect',
    status: 'active',
    mode: 'practice',
    level: 'B1',
    page: '2',
    limit: '20',
    sort: 'oldest',
  });
  expect(result.items[0]).toMatchObject({
    code: 'GR-20261010-001',
    grammarArea: 'tenses',
    grammarPoint: 'past perfect',
    questionCount: 5,
    maxScore: null,
    score: null,
    startedAt: listItems[0].started_at,
    status: 'active',
  });
  expect(result.meta).toEqual({ page: 1, limit: 20, total: 25, totalPages: 2 });
});

test('rows open the workspace or report according to session state', async () => {
  mockResponse({ items: listItems, meta: listMeta });
  const parsed = await getGrammarSessions({});
  render(
    <MemoryRouter>
      <GrammarSessionTable items={parsed.items} />
    </MemoryRouter>,
  );

  const activeRow = screen.getByRole('link', { name: /GR-20261010-001/ });
  expect(activeRow).toHaveAttribute('href', '/english/grammar/GR-20261010-001');
  expect(within(activeRow).getByText('Lanjutkan')).toBeInTheDocument();
  expect(within(activeRow).getByText('Tenses · Past Perfect')).toBeInTheDocument();
  expect(within(activeRow).getByText('Daily practice')).toBeInTheDocument();

  const completedRow = screen.getByRole('link', { name: /GR-20261009-001/ });
  expect(completedRow).toHaveAttribute('href', '/english/grammar/GR-20261009-001/report');
  expect(within(completedRow).getByText('Lihat hasil')).toBeInTheDocument();
  expect(within(completedRow).getByText('8/10')).toBeInTheDocument();
  expect(within(completedRow).getByText('Conditionals · Conditional Type 2')).toBeInTheDocument();

  const abandonedRow = screen.getByRole('link', { name: /GR-20261008-001/ });
  expect(abandonedRow).toHaveAttribute('href', '/english/grammar/GR-20261008-001');
  expect(within(abandonedRow).getByText('Buka sesi')).toBeInTheDocument();
  expect(within(abandonedRow).getByText('Dibatalkan')).toBeInTheDocument();
  expect(within(abandonedRow).getAllByText('—')).toHaveLength(2);
});

test('list page syncs status chips and pagination through the URL', async () => {
  const user = userEvent.setup();
  mockResponse({ items: listItems, meta: listMeta });
  render(
    <MemoryRouter initialEntries={['/english/grammar']}>
      <Routes>
        <Route path='/english/grammar' element={<GrammarListPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText('GR-20261010-001')).toBeInTheDocument();
  expect(Object.fromEntries(lastQuery().searchParams)).toEqual({ page: '1', limit: '20', sort: 'newest' });

  await user.click(screen.getByRole('button', { name: 'Aktif' }));
  expect(await screen.findByText('GR-20261010-001')).toBeInTheDocument();
  expect(Object.fromEntries(lastQuery().searchParams)).toEqual({
    status: 'active',
    page: '1',
    limit: '20',
    sort: 'newest',
  });

  await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
  expect(await screen.findByText('GR-20261010-001')).toBeInTheDocument();
  expect(Object.fromEntries(lastQuery().searchParams)).toEqual({
    status: 'active',
    page: '2',
    limit: '20',
    sort: 'newest',
  });
  expect(screen.getByText('Menampilkan 1–3 dari 25 sesi')).toBeInTheDocument();
});
