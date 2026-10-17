import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { GrammarSessionTable } from '../../components/grammar/grammar-session-table';
import { getGrammarSessions } from './grammar-api';
import GrammarListPage from './list/page';
import GrammarSessionPage from './session/page';

const listItems = [
  {
    code: 'GR-20261010-001',
    mode: 'practice',
    source: 'cron',
    status: 'active',
    level: 'B1',
    question_count: 5,
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
    question_count: 10,
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
    question_count: 5,
    score: null,
    max_score: null,
    started_at: '2026-10-08T03:00:00.000Z',
    completed_at: null,
  },
];

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
  mockResponse({ items: listItems });
  const result = await getGrammarSessions({
    q: 'past perfect',
    status: 'active',
    mode: 'practice',
    level: 'B1',
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
    limit: '20',
    sort: 'oldest',
  });
  expect(result.items[0]).toMatchObject({
    code: 'GR-20261010-001',
    questionCount: 5,
    maxScore: null,
    score: null,
    startedAt: listItems[0].started_at,
    status: 'active',
  });
});

test('rows open the workspace or report according to session state', async () => {
  mockResponse({ items: listItems });
  const parsed = await getGrammarSessions({});
  render(
    <MemoryRouter>
      <GrammarSessionTable items={parsed.items} />
    </MemoryRouter>,
  );

  const activeRow = screen.getByRole('link', { name: /GR-20261010-001/ });
  expect(activeRow).toHaveAttribute('href', '/english/grammar/GR-20261010-001');
  expect(within(activeRow).getByText('Daily practice')).toBeInTheDocument();

  const completedRow = screen.getByRole('link', { name: /GR-20261009-001/ });
  expect(completedRow).toHaveAttribute('href', '/english/grammar/GR-20261009-001/report');
  expect(within(completedRow).getByText('8/10')).toBeInTheDocument();

  const abandonedRow = screen.getByRole('link', { name: /GR-20261008-001/ });
  expect(abandonedRow).toHaveAttribute('href', '/english/grammar/GR-20261008-001');
  expect(within(abandonedRow).getByText('Dibatalkan')).toBeInTheDocument();
  expect(within(abandonedRow).getByText('—')).toBeInTheDocument();
});

test('list page syncs status chips through the URL', async () => {
  const user = userEvent.setup();
  mockResponse({ items: listItems });
  render(
    <MemoryRouter initialEntries={['/english/grammar']}>
      <Routes>
        <Route path='/english/grammar' element={<GrammarListPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText('GR-20261010-001')).toBeInTheDocument();
  expect(Object.fromEntries(lastQuery().searchParams)).toEqual({ limit: '100', sort: 'newest' });
  expect(screen.getByText('Menampilkan 3 sesi')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Aktif' }));
  expect(await screen.findByText('GR-20261010-001')).toBeInTheDocument();
  expect(Object.fromEntries(lastQuery().searchParams)).toEqual({
    status: 'active',
    limit: '100',
    sort: 'newest',
  });
});

const sessionPayload = {
  code: 'GR-20261011-001',
  mode: 'practice',
  source: 'request',
  status: 'active',
  level: 'B1',
  question_count: 2,
  score: null,
  max_score: null,
  started_at: '2026-10-11T03:00:00.000Z',
  completed_at: null,
  questions: [
    {
      question_number: 1,
      question_type: 'fill_blank',
      grammar_area: 'tenses',
      grammar_point: 'past perfect',
      level: 'B1',
      question_text: 'She ___ finished when I arrived.',
      answer: {
        user_answer: 'had',
        result: 'correct',
        feedback: null,
        answered_at: '2026-10-11T03:01:00.000Z',
        evaluated_at: '2026-10-11T03:02:00.000Z',
      },
    },
    {
      question_number: 2,
      question_type: 'fill_blank',
      grammar_area: 'tenses',
      grammar_point: 'past perfect',
      level: 'B1',
      question_text: 'They ___ left before noon.',
      answer: null,
    },
  ],
};

test('workspace opens the first question, formats lowercase labels, and gates explanations by result', async () => {
  const user = userEvent.setup();
  mockResponse(sessionPayload);
  render(
    <MemoryRouter initialEntries={['/english/grammar/GR-20261011-001']}>
      <Routes>
        <Route path='/english/grammar/:code' element={<GrammarSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Soal 1 dari 2')).toBeInTheDocument();
  expect(screen.queryByText(/Skor/)).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Past Perfect/ })).toBeInTheDocument();
  expect(screen.getByText('Fill Blank · Tenses · Past Perfect')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Lihat penjelasan' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
  expect(await screen.findByText('Soal 2 dari 2')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Lihat penjelasan' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeDisabled();
});

test('completed workspace shows the stored score in the session header', async () => {
  mockResponse({
    ...sessionPayload,
    status: 'completed',
    score: 1,
    max_score: 2,
    completed_at: '2026-10-11T03:10:00.000Z',
  });
  render(
    <MemoryRouter initialEntries={['/english/grammar/GR-20261011-001']}>
      <Routes>
        <Route path='/english/grammar/:code' element={<GrammarSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText('Skor')).toBeInTheDocument();
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Lihat laporan' })).toBeInTheDocument();
});
