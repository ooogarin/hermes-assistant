import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { WritingDraftForm } from '../../components/writing/writing-draft-form';
import { WritingSubmissionForm } from '../../components/writing/writing-submission-form';
import CorrectedWritingPage from './corrected-text/page';
import WritingCreatePage from './create/page';
import WritingDetailPage from './detail/page';
import WritingFeedbackPage from './feedback/page';
import WritingListPage from './list/page';
import WritingMaterialPage from './material/page';
import * as api from './writing-api';

const code = 'WS-20261003-001';
const materialCode = 'WR-20261003-001';
const originalText = '  I enjoy running.\n\nIt helps me relax.  ';
const wireSubmission = {
  code,
  material_code: null,
  original_text: originalText,
  word_count: 8,
  estimated_topic: null,
  estimated_genre: null,
  estimated_tags: null,
  estimated_level: null,
  analysis_status: 'not_analyzed',
  analysis: null,
  analyzed_at: null,
  created_at: '2026-10-03T03:00:00.000Z',
  updated_at: '2026-10-03T03:00:00.000Z',
};
const analysis = {
  summary: { overall_feedback: 'Clear writing.', strengths: ['Good examples.'], priority_improvements: [] },
  grammar: { error_count: 0, items: [] },
  corrected_text: 'I enjoy running.\nIt helps me relax.',
  vocabulary: { repeated_words: [], better_phrases: [], new_useful_words: [] },
  structure: { feedback: 'Well organized.', suggestions: [] },
  prompt_adherence: null,
  next_steps: ['Try a longer paragraph.'],
};
const analyzedSubmission = {
  ...wireSubmission,
  estimated_topic: 'Running',
  estimated_genre: 'Personal reflection',
  estimated_tags: ['fitness'],
  estimated_level: 'B1',
  analysis_status: 'analyzed',
  analysis,
  analyzed_at: '2026-10-03T04:00:00.000Z',
};
const wireListItem = { ...wireSubmission, text_excerpt: originalText };
const meta = { page: 1, limit: 20, total: 1, total_pages: 1 };
const response = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200 });
const mockResponse = (data: unknown) => {
  const fetch = vi.fn(async (_path: string, _options: RequestInit) => response(data));
  vi.stubGlobal('fetch', fetch);

  return fetch;
};
const renderPage = (element: React.ReactNode, path = '/') =>
  render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('settings sends the snake_case contract used by the backend validator', async () => {
  const fetch = mockResponse({
    default_level: 'B1',
    default_word_count: 200,
    min_word_count: 150,
    max_word_count: 250,
    updated_at: wireSubmission.updated_at,
  });
  await api.updateWritingSettings({ defaultLevel: 'B1', defaultWordCount: 200, minWordCount: 150, maxWordCount: 250 });

  expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toEqual({
    default_level: 'B1',
    default_word_count: 200,
    min_word_count: 150,
    max_word_count: 250,
  });
});

test('save uses independent submissions, preserves exact text, and accepts null analysis and estimates', async () => {
  const fetch = mockResponse(wireSubmission);
  const submission = await api.createWritingSubmission(originalText);

  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/writing/submissions',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ original_text: originalText }),
      credentials: 'same-origin',
    }),
  );
  expect(submission).toMatchObject({ code, originalText, analysis: null, estimatedTopic: null, analyzedAt: null });
  await api.createWritingSubmission(originalText, materialCode);
  expect(JSON.parse(String(fetch.mock.calls[1]?.[1].body ?? '{}'))).toEqual({
    original_text: originalText,
    material_code: materialCode,
  });
});

test('submission filters and corrected-text reads use the new code contract', async () => {
  const fetch = mockResponse({ items: [wireListItem], meta });
  const collection = await api.getWritingSubmissions({
    writingType: 'free',
    analysisStatus: 'not_analyzed',
    q: 'running',
    page: 2,
  });
  const url = new URL(String(fetch.mock.calls[0]?.[0]), 'http://localhost');

  expect(Object.fromEntries(url.searchParams)).toEqual({
    writing_type: 'free',
    analysis_status: 'not_analyzed',
    q: 'running',
    page: '2',
  });
  expect(collection.items[0]).toMatchObject({ code, textExcerpt: originalText, estimatedTags: null });
  fetch.mockImplementation(async () => response({ code, corrected_text: 'Improved text' }));
  expect(await api.getCorrectedWriting(code)).toEqual({ code, correctedText: 'Improved text' });
  expect(fetch.mock.calls[1]?.[0]).toBe(`/api/v1/writing/submissions/${code}/corrected-text`);
});

test('material collections accept saved but unanalyzed status and independent WS summaries', async () => {
  mockResponse({
    items: [
      {
        code: materialCode,
        topic: 'Food',
        prompt_excerpt: 'Describe a meal.',
        genre: 'Essay',
        level: 'B1',
        target_word_count: 200,
        tags: [],
        source: 'cron',
        status: 'submitted',
        submission_count: 1,
        analyzed_submission_count: 0,
        unanalyzed_submission_count: 1,
        latest_submission_code: code,
        created_at: wireSubmission.created_at,
      },
    ],
    meta,
  });
  const collection = await api.getWritingMaterials({ status: 'submitted' });

  expect(collection.items[0]).toMatchObject({
    status: 'submitted',
    latestSubmissionCode: code,
    analyzedSubmissionCount: 0,
    unanalyzedSubmissionCount: 1,
  });
});

test('create preserves the draft on failure and then navigates to the saved WS detail', async () => {
  const user = userEvent.setup();
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('Network failed'))
    .mockResolvedValueOnce(response(wireSubmission));
  vi.stubGlobal('fetch', fetch);
  renderPage(
    <Routes>
      <Route path='/' element={<WritingDraftForm />} />
      <Route path='/english/writing/submissions/:code' element={<h1>Saved submission</h1>} />
    </Routes>,
  );

  fireEvent.change(screen.getByLabelText('Tulisanmu'), { target: { value: originalText } });
  await user.click(screen.getByRole('button', { name: 'Simpan tulisan' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Tulisan belum dapat disimpan.');
  expect(screen.getByLabelText('Tulisanmu')).toHaveValue(originalText);
  await user.click(screen.getByRole('button', { name: 'Simpan tulisan' }));
  expect(await screen.findByRole('heading', { name: 'Saved submission' })).toBeInTheDocument();
  expect(fetch.mock.calls[1]?.[1].body).toBe(JSON.stringify({ original_text: originalText }));
});

test('back from a dirty free-writing form asks before discarding', async () => {
  const user = userEvent.setup();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  renderPage(
    <Routes>
      <Route path='/' element={<WritingCreatePage />} />
      <Route path='/english/writing' element={<h1>List</h1>} />
    </Routes>,
  );

  await user.type(screen.getByLabelText('Tulisanmu'), 'Unsaved writing');
  await user.click(screen.getByRole('link', { name: 'Kembali ke Writing' }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByLabelText('Tulisanmu')).toHaveValue('Unsaved writing');
});

test('analyzed text is unavailable for edit while metadata PATCH remains sparse and supports empty tags', async () => {
  const user = userEvent.setup();
  const fetch = mockResponse(analyzedSubmission);
  const submission = await api.getWritingSubmission(code);
  renderPage(<WritingSubmissionForm submission={submission} />);

  expect(screen.queryByLabelText('Tulisanmu')).not.toBeInTheDocument();
  await user.clear(screen.getByLabelText('Estimasi topik'));
  expect(screen.getByRole('button', { name: 'Simpan perubahan' })).toBeDisabled();
  await user.type(screen.getByLabelText('Estimasi topik'), 'Sports');
  await user.click(screen.getByRole('button', { name: 'Hapus tag fitness' }));
  await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));

  const request = fetch.mock.calls[1]?.[1];
  expect(request?.method).toBe('PATCH');
  expect(JSON.parse(String(request?.body))).toEqual({ estimated_topic: 'Sports', estimated_tags: [] });
});

test('a concurrent analysis lock preserves the draft and allows a later metadata-only save', async () => {
  const user = userEvent.setup();
  const fetch = mockResponse(wireSubmission);
  const submission = await api.getWritingSubmission(code);
  fetch.mockImplementationOnce(
    async () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'WRITING_SUBMISSION_TEXT_LOCKED', message: 'Text locked' },
        }),
        { status: 409 },
      ),
  );
  renderPage(<WritingSubmissionForm submission={submission} />);

  fireEvent.change(screen.getByLabelText('Tulisanmu'), { target: { value: 'My unsaved edit' } });
  await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Perubahan teks belum disimpan');
  expect(screen.getByLabelText('Perubahan teks yang belum disimpan')).toHaveValue('My unsaved edit');
  expect(screen.getByLabelText('Perubahan teks yang belum disimpan')).toHaveAttribute('readonly');
  expect(screen.getByRole('button', { name: 'Simpan perubahan' })).toBeDisabled();
  await user.type(screen.getByLabelText('Estimasi topik'), 'Sports');
  await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
  expect(JSON.parse(String(fetch.mock.calls[2]?.[1].body ?? '{}'))).toEqual({ estimated_topic: 'Sports' });
});

test('unanalyzed detail displays missing estimates and an inactive Telegram-only analysis CTA', async () => {
  const fetch = mockResponse(wireSubmission);
  renderPage(
    <Routes>
      <Route path='/submissions/:code' element={<WritingDetailPage />} />
    </Routes>,
    `/submissions/${code}`,
  );

  const button = await screen.findByRole('button', { name: 'Analisis tulisan' });
  expect(button).toBeDisabled();
  expect(button).toHaveAccessibleDescription(/Telegram/);
  expect(screen.getAllByText('Belum diestimasi')).toHaveLength(4);
  expect(screen.getByRole('article', { name: 'Tulisan asli' }).textContent).toBe(originalText);
  expect(screen.getByRole('link', { name: 'Edit tulisan' })).toHaveAttribute(
    'href',
    `/english/writing/submissions/${code}/edit`,
  );
  expect(fetch).toHaveBeenCalledOnce();
});

test('list applies filters and sort through the Notes-style toolbar without pagination controls', async () => {
  const user = userEvent.setup();
  const fetch = mockResponse({ items: [wireListItem], meta });
  renderPage(<WritingListPage />, '/english/writing?q=running&page=3');
  expect(await screen.findByRole('heading', { name: code })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: new RegExp(code) })).toHaveAttribute(
    'href',
    `/english/writing/submissions/${code}`,
  );

  await user.click(screen.getByRole('button', { name: 'Belum dianalisis' }));
  await screen.findByRole('heading', { name: code });
  await user.click(screen.getByRole('button', { name: 'Filter' }));
  await user.click(screen.getByRole('button', { name: 'Buka jenis tulisan' }));
  await user.click(screen.getByRole('option', { name: 'Tulisan bebas' }));
  await user.click(screen.getByRole('button', { name: 'Terapkan filter' }));
  await screen.findByRole('heading', { name: code });
  await user.click(screen.getByRole('button', { name: 'Urutkan: Terbaru' }));
  await screen.findByRole('heading', { name: code });
  const lastCall = fetch.mock.calls.at(-1);
  const url = new URL(String(lastCall?.[0]), 'http://localhost');
  expect(url.searchParams.get('page')).toBe('1');
  expect(url.searchParams.get('q')).toBe('running');
  expect(url.searchParams.get('writing_type')).toBe('free');
  expect(url.searchParams.get('analysis_status')).toBe('not_analyzed');
  expect(url.searchParams.get('sort')).toBe('oldest');
  expect(screen.queryByRole('button', { name: 'Berikutnya' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sebelumnya' })).not.toBeInTheDocument();
  expect(screen.getByText('Menampilkan 1 tulisan')).toBeInTheDocument();
});

test('material history loads WS references and new drafts save against the prompt', async () => {
  const user = userEvent.setup();
  const fetch = vi.fn(async (path: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      return response({ ...wireSubmission, material_code: materialCode });
    }

    if (path.startsWith('/api/v1/writing/submissions?')) {
      return response({ items: [{ ...wireListItem, material_code: materialCode }], meta });
    }

    return response({
      code: materialCode,
      topic: 'Food',
      prompt_text: 'Write about a meal.',
      level: 'B1',
      genre: 'Essay',
      tags: [],
      target_word_count: 200,
      source: 'cron',
    });
  });
  vi.stubGlobal('fetch', fetch);
  renderPage(
    <Routes>
      <Route path='/materials/:code' element={<WritingMaterialPage />} />
      <Route path='/english/writing/submissions/:code' element={<h1>Saved</h1>} />
    </Routes>,
    `/materials/${materialCode}`,
  );

  expect(await screen.findByRole('heading', { name: code })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: new RegExp(code) })).toHaveAttribute(
    'href',
    `/english/writing/submissions/${code}`,
  );
  const historyUrl = new URL(
    String(fetch.mock.calls.find(([path]) => path.includes('/submissions?'))?.[0]),
    'http://localhost',
  );
  expect(historyUrl.searchParams.get('material_code')).toBe(materialCode);
  fireEvent.change(screen.getByLabelText('Tulisanmu'), { target: { value: originalText } });
  await user.click(screen.getByRole('button', { name: 'Simpan tulisan' }));
  expect(await screen.findByRole('heading', { name: 'Saved' })).toBeInTheDocument();
  const createRequest = fetch.mock.calls.find(([, options]) => options?.method === 'POST')?.[1];
  expect(JSON.parse(String(createRequest?.body))).toEqual({ original_text: originalText, material_code: materialCode });
});

test.each([
  { prompted: false, adherence: null },
  {
    prompted: true,
    adherence: { status: 'not_aligned', notes: 'The prompt asked about food; this text discusses sports.' },
  },
])('feedback renders concise prompt adherence only when present: $prompted', async ({ prompted, adherence }) => {
  mockResponse({
    ...analyzedSubmission,
    material_code: prompted ? materialCode : null,
    analysis: { ...analysis, prompt_adherence: adherence },
  });
  renderPage(
    <Routes>
      <Route path='/submissions/:code/feedback' element={<WritingFeedbackPage />} />
    </Routes>,
    `/submissions/${code}/feedback`,
  );

  expect(await screen.findByRole('heading', { name: 'Feedback tulisan' })).toBeInTheDocument();
  const heading = screen.queryByRole('heading', { name: 'Kesesuaian dengan prompt' });
  if (prompted) {
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Kurang sesuai')).toBeInTheDocument();
  } else {
    expect(heading).not.toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Lihat versi perbaikan' })).toHaveAttribute(
    'href',
    `/english/writing/submissions/${code}/corrected-text`,
  );
});

test('corrected text handles the not-analyzed response without a generic retry error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'WRITING_SUBMISSION_NOT_ANALYZED', message: 'Not analyzed' },
          }),
          { status: 409 },
        ),
    ),
  );
  renderPage(
    <Routes>
      <Route path='/submissions/:code/corrected-text' element={<CorrectedWritingPage />} />
    </Routes>,
    `/submissions/${code}/corrected-text`,
  );

  expect(await screen.findByRole('heading', { name: 'Tulisan belum dianalisis' })).toBeInTheDocument();
});

test.each([
  { name: 'submissions', load: api.getAllWritingSubmissions, item: wireListItem },
  {
    name: 'materials',
    load: api.getAllWritingMaterials,
    item: {
      code: materialCode,
      topic: 'Food',
      prompt_excerpt: 'Describe a meal.',
      genre: 'Essay',
      level: 'B1',
      target_word_count: 200,
      tags: [],
      source: 'cron',
      status: 'submitted',
      submission_count: 1,
      analyzed_submission_count: 0,
      unanalyzed_submission_count: 1,
      latest_submission_code: code,
      created_at: wireSubmission.created_at,
    },
  },
])('loads every $name result beyond the API page size while retaining filters', async ({ load, item }) => {
  const items = Array.from({ length: 101 }, (_, index) => ({ ...item, code: `${item.code}-${index}` }));
  const signal = new AbortController().signal;
  const fetch = vi.fn(async (path: string, _options: RequestInit) => {
    const url = new URL(path, 'http://localhost');
    const page = Number(url.searchParams.get('page'));

    return response({
      items: items.slice((page - 1) * 100, page * 100),
      meta: { page, limit: 100, total: 101, total_pages: 2 },
    });
  });
  vi.stubGlobal('fetch', fetch);
  const results = await load({ q: 'running', sort: 'oldest' }, signal);

  expect(results.map((item) => item.code)).toEqual(items.map((item) => item.code));
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [path, options] of fetch.mock.calls) {
    const url = new URL(path, 'http://localhost');
    expect(url.searchParams.get('q')).toBe('running');
    expect(url.searchParams.get('sort')).toBe('oldest');
    expect(url.searchParams.get('limit')).toBe('100');
    expect(options.signal).toBe(signal);
  }
});

test('a later collection page failure rejects the collection instead of displaying incomplete results', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response({ items: [wireListItem], meta: { ...meta, total: 2, total_pages: 2 } }))
    .mockRejectedValueOnce(new TypeError('Network unavailable'));
  vi.stubGlobal('fetch', fetch);

  await expect(api.getAllWritingSubmissions({})).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
});
