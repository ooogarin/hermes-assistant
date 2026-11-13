import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ApiError } from '../../lib/api/api-error';
import JunkCreatePage from './create/page';
import { describeJunkAiError } from './junk-display';

const createdItemWire = {
  code: 'JK-20261114-001',
  title: 'Rust ownership article',
  category: 'Article',
  raw_text: 'artikel bagus soal rust https://blog.example.com/rust',
  content_text: 'Article about Rust ownership.',
  source_url: 'https://blog.example.com/rust',
  source_name: null,
  tags: ['Rust', 'Programming'],
  created_at: '2026-11-14T10:00:00.000Z',
  updated_at: '2026-11-14T10:00:00.000Z',
};

type FetchCall = {
  body?: unknown;
  method?: string;
  url: string;
};

const renderCreatePage = () => {
  render(
    <MemoryRouter initialEntries={['/junk/new']}>
      <Routes>
        <Route path='/junk/new' element={<JunkCreatePage />} />
        <Route path='/junk/:code' element={<div>Detail page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

const stubCreateFetch = (calls: FetchCall[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string, init?: RequestInit) => {
      calls.push({
        body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
        method: init?.method,
        url: path,
      });

      return new Response(JSON.stringify({ success: true, data: createdItemWire }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    }),
  );
};

const stubErrorFetch = (code: string, status: number) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: { code, message: `Safe ${code} message.`, details: null },
            request_id: 'req_test',
          }),
          { headers: { 'Content-Type': 'application/json' }, status },
        ),
    ),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('starts on the manual form and does not send raw_text on a manual create', async () => {
  const user = userEvent.setup();
  const calls: FetchCall[] = [];
  stubCreateFetch(calls);
  renderCreatePage();

  expect(screen.getByRole('button', { name: 'Manual' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Manual' }).querySelector('svg')).toBeNull();
  expect(screen.getByRole('button', { name: 'Dengan AI' }).querySelector('svg')).not.toBeNull();
  expect(screen.getByLabelText('Judul')).toBeInTheDocument();
  expect(screen.queryByLabelText('Pesan')).not.toBeInTheDocument();

  await user.type(screen.getByLabelText('Judul'), 'Manual item');
  await user.type(screen.getByLabelText('Kategori'), 'Reference');
  await user.click(screen.getByRole('button', { name: 'Simpan Junk' }));

  expect(await screen.findByText('Detail page')).toBeInTheDocument();
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toBe('/api/v1/junk');
  expect(calls[0]).toEqual({
    body: {
      category: 'Reference',
      content_text: null,
      source_url: null,
      source_name: null,
      tags: [],
      title: 'Manual item',
    },
    method: 'POST',
    url: '/api/v1/junk',
  });
});

test('saves the AI message in one request without a review step', async () => {
  const user = userEvent.setup();
  const calls: FetchCall[] = [];
  stubCreateFetch(calls);
  renderCreatePage();

  await user.click(screen.getByRole('button', { name: 'Dengan AI' }));
  await user.type(screen.getByLabelText('Pesan'), createdItemWire.raw_text);
  expect(screen.queryByLabelText('Judul')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Simpan dengan AI' }));

  expect(await screen.findByText('Detail page')).toBeInTheDocument();
  expect(calls).toEqual([{ body: { text: createdItemWire.raw_text }, method: 'POST', url: '/api/v1/junk/ai' }]);
});

test('keeps the message and shows a safe error when the AI feature is not configured', async () => {
  const user = userEvent.setup();
  stubErrorFetch('AI_NOT_CONFIGURED', 503);
  renderCreatePage();

  await user.click(screen.getByRole('button', { name: 'Dengan AI' }));
  await user.type(screen.getByLabelText('Pesan'), 'hello');
  await user.click(screen.getByRole('button', { name: 'Simpan dengan AI' }));

  expect(await screen.findByText('Fitur AI belum dikonfigurasi di server.')).toBeInTheDocument();
  expect(screen.getByLabelText('Pesan')).toHaveValue('hello');
  expect(screen.queryByText('Detail page')).not.toBeInTheDocument();
});

test('shows a retryable message when the AI provider fails', async () => {
  const user = userEvent.setup();
  stubErrorFetch('AI_UNAVAILABLE', 503);
  renderCreatePage();

  await user.click(screen.getByRole('button', { name: 'Dengan AI' }));
  await user.type(screen.getByLabelText('Pesan'), 'hello');
  await user.click(screen.getByRole('button', { name: 'Simpan dengan AI' }));

  expect(await screen.findByText('Junk belum bisa disimpan dengan AI. Coba lagi.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Simpan dengan AI' })).toBeEnabled();
});

test('maps safe AI error codes to Indonesian copy', () => {
  expect(
    describeJunkAiError(
      new ApiError({ code: 'AI_NOT_CONFIGURED', message: 'AI feature is not configured.', status: 503 }),
    ),
  ).toBe('Fitur AI belum dikonfigurasi di server.');
  expect(
    describeJunkAiError(
      new ApiError({ code: 'AI_AUTH_FAILED', message: 'AI credentials were rejected.', status: 503 }),
    ),
  ).toBe('Kredensial AI ditolak. Periksa AI_API_KEY di server.');
  expect(
    describeJunkAiError(
      new ApiError({
        code: 'AI_CONFIGURATION_ERROR',
        message: 'AI provider rejected the request configuration.',
        status: 503,
      }),
    ),
  ).toBe('Konfigurasi AI tidak cocok. Periksa AI_BASE_URL dan AI_MODEL.');
  expect(
    describeJunkAiError(
      new ApiError({ code: 'AI_RATE_LIMITED', message: 'AI provider rate limit reached.', status: 503 }),
    ),
  ).toBe('AI sedang membatasi permintaan. Coba lagi sebentar lagi.');
  expect(
    describeJunkAiError(new ApiError({ code: 'AI_UNAVAILABLE', message: 'AI service is unavailable.', status: 503 })),
  ).toBe('Junk belum bisa disimpan dengan AI. Coba lagi.');
  expect(describeJunkAiError(new ApiError({ code: 'AI_INVALID_RESPONSE', message: 'Invalid.', status: 503 }))).toBe(
    'Junk belum bisa disimpan dengan AI. Coba lagi.',
  );
  expect(describeJunkAiError(new ApiError({ code: 'VALIDATION_ERROR', message: 'Invalid.', status: 400 }))).toBe(
    'Pesan belum bisa diproses. Periksa panjang teks.',
  );
  expect(describeJunkAiError(new Error('boom'))).toBe('Junk belum bisa disimpan dengan AI. Coba lagi.');
});
