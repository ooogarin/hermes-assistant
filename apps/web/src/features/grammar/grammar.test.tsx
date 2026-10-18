import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { GrammarSessionTable } from '../../components/grammar/grammar-session-table';
import { getGrammarSessions } from './grammar-api';
import GrammarListPage from './list/page';
import GrammarReportPage from './report/page';
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

test('rows always open the session workspace', async () => {
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
  expect(completedRow).toHaveAttribute('href', '/english/grammar/GR-20261009-001');
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
      explanation: null,
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
      explanation: null,
      answer: null,
    },
  ],
};

const explanationPayload = {
  question_number: 1,
  question_text: 'She ___ finished when I arrived.',
  grammar_area: 'tenses',
  grammar_point: 'past perfect',
  explanation: 'Gunakan had + past participle untuk kejadian yang selesai sebelum kejadian lain.',
};

const mockSessionAndExplanation = (session: unknown, explanation: unknown = explanationPayload) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (input: unknown) => {
      const url = String(input);
      const data = url.includes('/explanation') ? explanation : session;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }),
  );

test('workspace opens the first question, formats lowercase labels, and gates explanations by result', async () => {
  const user = userEvent.setup();
  mockSessionAndExplanation(sessionPayload);
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
  expect(screen.getByRole('button', { name: /Lihat penjelasan/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Soal' })).toHaveAttribute('href', '/english/grammar/GR-20261011-001');
  expect(screen.queryByRole('link', { name: 'Laporan' })).not.toBeInTheDocument();
  expect(screen.getByText('Laporan')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sebelumnya' })).toBeDisabled();

  await user.click(screen.getByRole('button', { name: 'Berikutnya' }));
  expect(await screen.findByText('Soal 2 dari 2')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Lihat penjelasan/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Berikutnya' })).toBeDisabled();
});

test('explanation drawer opens and closes in place without losing the selected question', async () => {
  const user = userEvent.setup();
  mockSessionAndExplanation(sessionPayload);
  render(
    <MemoryRouter initialEntries={['/english/grammar/GR-20261011-001']}>
      <Routes>
        <Route path='/english/grammar/:code' element={<GrammarSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );

  const toggle = await screen.findByRole('button', { name: /Lihat penjelasan/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(explanationPayload.explanation)).not.toBeInTheDocument();

  await user.click(toggle);
  expect(await screen.findByText(explanationPayload.explanation)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Sembunyikan penjelasan/ })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Soal 1 dari 2')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /Sembunyikan penjelasan/ }));
  expect(screen.queryByText(explanationPayload.explanation)).not.toBeInTheDocument();
  expect(screen.getByText('Soal 1 dari 2')).toBeInTheDocument();
});

test('completed exam workspace renders embedded explanations without another request', async () => {
  const user = userEvent.setup();
  const examSession = {
    ...sessionPayload,
    mode: 'exam',
    status: 'completed',
    score: 1,
    max_score: 2,
    completed_at: '2026-10-11T03:10:00.000Z',
    questions: [
      {
        ...sessionPayload.questions[0],
        explanation: 'Penjelasan tersimpan dari sesi.',
      },
      sessionPayload.questions[1],
    ],
  };
  mockSessionAndExplanation(examSession);
  render(
    <MemoryRouter initialEntries={['/english/grammar/GR-20261011-001']}>
      <Routes>
        <Route path='/english/grammar/:code' element={<GrammarSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole('button', { name: /Lihat penjelasan/ }));
  expect(await screen.findByText('Penjelasan tersimpan dari sesi.')).toBeInTheDocument();
  expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
});

test('explanation drawer shows a retry state when the request fails', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (input: unknown) => {
      if (String(input).includes('/explanation')) {
        return new Response(JSON.stringify({ error: { code: 'REQUEST_FAILED', message: 'Gagal' }, success: false }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ success: true, data: sessionPayload }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }),
  );
  render(
    <MemoryRouter initialEntries={['/english/grammar/GR-20261011-001']}>
      <Routes>
        <Route path='/english/grammar/:code' element={<GrammarSessionPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole('button', { name: /Lihat penjelasan/ }));
  expect(await screen.findByText('Penjelasan belum dapat dimuat.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  expect(screen.getByText('Soal 1 dari 2')).toBeInTheDocument();
});

test('completed workspace shows the stored score in the session header', async () => {
  mockSessionAndExplanation({
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
  expect(screen.getByRole('link', { name: 'Laporan' })).toHaveAttribute(
    'href',
    '/english/grammar/GR-20261011-001/report',
  );
});

test('report shows the per-area breakdown table and the result summary', async () => {
  const reportPayload = {
    code: 'GR-20261011-001',
    status: 'completed',
    score: 1,
    max_score: 2,
    breakdown: [
      { grammar_area: 'passive_voice', correct: 0, partial: 0, incorrect: 1 },
      { grammar_area: 'tenses', correct: 1, partial: 0, incorrect: 0 },
    ],
  };
  const reportSession = {
    ...sessionPayload,
    status: 'completed',
    score: 1,
    max_score: 2,
    completed_at: '2026-10-11T03:10:00.000Z',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (input: unknown) => {
      const url = String(input);
      const data = url.includes('/report') ? reportPayload : reportSession;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }),
  );
  render(
    <MemoryRouter initialEntries={['/english/grammar/GR-20261011-001/report']}>
      <Routes>
        <Route path='/english/grammar/:code/report' element={<GrammarReportPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole('heading', { name: 'Breakdown per area' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Proporsi' })).toBeInTheDocument();
  expect(screen.getByText('Passive Voice')).toBeInTheDocument();
  expect(screen.getByText('Tenses')).toBeInTheDocument();
  expect(screen.getByText('0%')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();

  expect(screen.getByRole('heading', { name: 'Ringkasan hasil' })).toBeInTheDocument();
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
  expect(screen.getByText('0 soal')).toBeInTheDocument();
  expect(screen.getByText('2 dari 2')).toBeInTheDocument();
  expect(screen.queryByText('Langkah berikutnya')).not.toBeInTheDocument();
});
