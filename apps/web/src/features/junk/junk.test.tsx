import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { JunkActions } from '../../components/junk/junk-actions';
import { JunkDetailPane } from '../../components/junk/junk-detail-pane';
import { JunkForm } from '../../components/junk/junk-form';
import { JunkList } from '../../components/junk/junk-list';
import JunkDetailPage from './detail/page';
import * as api from './junk-api';
import { getJunkExcerpt, getSafeSourceUrl, getSourceName } from './junk-display';
import JunkListPage from './list/page';
import type { JunkItem } from './junk-api';

const item: JunkItem = {
  code: 'JK-20260908-001',
  title: 'A saved video',
  category: 'Music',
  contentText: 'A useful description.',
  rawText: 'Original message\nwith a second line.',
  sourceUrl: 'https://www.youtube.com/watch?v=123',
  sourceName: 'YouTube',
  tags: ['music', 'old', 'pop', 'western', 'live', 'concert', 'acoustic'],
  createdAt: '2026-09-08T09:00:00.000Z',
  updatedAt: '2026-09-08T09:00:00.000Z',
  deletedAt: null,
};
const wireItem = {
  code: item.code,
  title: item.title,
  category: item.category,
  content_text: item.contentText,
  raw_text: item.rawText,
  source_url: item.sourceUrl,
  source_name: item.sourceName,
  tags: item.tags,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
  deleted_at: null,
};
const mockResponse = (data: unknown) => {
  const fetch = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify({ success: true, data }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
};
const dialogMethods = ['showModal', 'close'] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  dialogMethods.forEach((name, index) => {
    const descriptor = originalDialogMethods[index];
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  });
});

test('uses natural source names with a safe legacy fallback', () => {
  expect(getSourceName(item)).toBe('YouTube');
  expect(getSourceName({ sourceName: 'My publication', sourceUrl: item.sourceUrl })).toBe('My publication');
  expect(getSourceName({ sourceName: null, sourceUrl: 'https://m.youtube.com/watch?v=1' })).toBe('YouTube');
  expect(getSourceName({ sourceName: null, sourceUrl: 'https://youtube.com.evil.test/page' })).toBe(
    'youtube.com.evil.test',
  );
  expect(getSourceName({ sourceName: null, sourceUrl: 'https://www.example.org/post' })).toBe('example.org');
  expect(getSourceName({ sourceName: null, sourceUrl: null })).toBeNull();
  expect(getSafeSourceUrl('javascript:alert(1)')).toBeNull();
  expect(getSafeSourceUrl('not a URL')).toBeNull();
});

test('derives preview only from content text without an arbitrary character limit', () => {
  expect(getJunkExcerpt({ ...item, contentText: '  First\n   second  ' })).toBe('First second');
  expect(getJunkExcerpt({ ...item, contentText: null })).toBeNull();
  expect(getJunkExcerpt({ ...item, contentText: 'a'.repeat(600) })).toHaveLength(600);
});

test('renders clickable date-first rows, separate source, three tags, and no code column', () => {
  render(
    <MemoryRouter>
      <JunkList items={[item]} selectedCode={item.code} toDetail={(code) => `/junk?preview=${code}`} />
    </MemoryRouter>,
  );
  const row = screen.getByRole('link');
  expect(row).toHaveAttribute('aria-current', 'true');
  expect(row.querySelector('time')).toHaveTextContent('8 Sep 2026');
  expect(screen.getByText('A useful description.')).toHaveClass('line-clamp-3');
  expect(within(screen.getByRole('list', { name: 'Tag Junk' })).getAllByRole('listitem')).toHaveLength(6);
  expect(screen.getByLabelText('2 tag lainnya')).toHaveTextContent('+2');
  expect(screen.queryByText(item.code)).not.toBeInTheDocument();
  expect(within(row).getByText('YouTube', { exact: false })).toBeInTheDocument();
  expect(row.querySelectorAll('a')).toHaveLength(0);
});

test('preview has content only, one category, icon-only copy, expand, and close controls', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onOpenPage = vi.fn();
  render(<JunkDetailPane item={item} onClose={onClose} onOpenPage={onOpenPage} />);
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  expect(screen.queryByText('Original message', { exact: false })).not.toBeInTheDocument();
  expect(screen.getAllByText('Music')).toHaveLength(1);
  const source = screen.getByRole('link', { name: /YouTube/ });
  expect(source).toHaveAttribute('href', item.sourceUrl);
  expect(source).toHaveAttribute('target', '_blank');
  await user.click(screen.getByRole('button', { name: 'Salin tautan' }));
  expect(await navigator.clipboard.readText()).toBe(item.sourceUrl);
  expect(screen.getByText('Berhasil disalin')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Buka halaman detail' }));
  await user.click(screen.getByRole('button', { name: 'Tutup preview' }));
  expect(onOpenPage).toHaveBeenCalledOnce();
  expect(onClose).toHaveBeenCalledOnce();
});

test('full-page switch replaces only the content and preserves title and metadata', async () => {
  const user = userEvent.setup();
  render(<JunkDetailPane item={item} mode='page' />);
  const toggle = screen.getByRole('switch', { name: 'Teks asli' });
  expect(toggle).not.toBeChecked();
  await user.click(toggle);
  expect(screen.getByRole('article', { name: 'Teks asli' }).textContent).toBe(item.rawText);
  expect(screen.queryByText(item.contentText ?? '')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(item.title ?? '');
  expect(screen.getByText(item.code)).toBeInTheDocument();
  await user.click(toggle);
  expect(screen.getByRole('article', { name: 'Konten' })).toHaveTextContent(item.contentText ?? '');
});

test('raw switch is unavailable when original text is missing', () => {
  render(<JunkDetailPane item={{ ...item, rawText: null }} mode='page' />);
  expect(screen.getByRole('switch', { name: /Teks asli/ })).toBeDisabled();
});

test('copy failure is reported without displaying a false success', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
  render(<JunkDetailPane item={item} />);
  await user.click(screen.getByRole('button', { name: 'Salin tautan' }));
  expect(await screen.findByText('Gagal menyalin. Coba lagi.')).toBeInTheDocument();
  expect(screen.queryByText('Berhasil disalin')).not.toBeInTheDocument();
});

test('list opens, expands, returns to the selected item and filters, then closes the preview', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => {
      const data = path.startsWith('/api/v1/junk?') ? { items: [wireItem] } : wireItem;
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }),
  );
  render(
    <MemoryRouter initialEntries={['/junk?q=video']}>
      <Routes>
        <Route path='/junk' element={<JunkListPage />} />
        <Route path='/junk/:code' element={<JunkDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'A saved video' })).toBeInTheDocument();
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tambah Junk' }).closest('header')).not.toBeNull();
  const row = screen.getByRole('heading', { name: 'A saved video' }).closest('a');
  expect(row).not.toBeNull();
  if (row === null) throw new Error('Expected a clickable row');
  await user.click(row);
  const preview = await screen.findByRole('complementary', { name: 'Detail A saved video' });
  expect(within(preview).queryByRole('searchbox')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('video')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Buka halaman detail' }));
  expect(await screen.findByRole('switch', { name: 'Teks asli' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Kembali ke Junk' }));
  expect(await screen.findByRole('button', { name: 'Tutup preview' })).toBeInTheDocument();
  expect(screen.getByDisplayValue('video')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tutup preview' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('video')).toBeInTheDocument();
});

test('action disclosure supports keyboard dismissal and confirms before deleting', async () => {
  const user = userEvent.setup();
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    },
  });
  const remove = vi.spyOn(api, 'deleteJunkItem').mockResolvedValue();
  const onDeleted = vi.fn();
  render(
    <MemoryRouter>
      <JunkActions item={item} onDeleted={onDeleted} />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole('button', { name: 'Aksi Junk' });
  expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  await user.click(trigger);
  await user.tab();
  expect(screen.getByRole('link', { name: 'Edit' })).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Hapus' }));
  expect(remove).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Batal' }));
  expect(remove).not.toHaveBeenCalled();
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Hapus' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }));
  expect(remove).toHaveBeenCalledWith(item.code);
  expect(onDeleted).toHaveBeenCalledOnce();
});

test('form lets users save or clear an optional source name', async () => {
  const user = userEvent.setup();
  const submit = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <JunkForm cancelTo='/junk' initial={item} onSubmit={submit} submitLabel='Simpan' />
    </MemoryRouter>,
  );
  await user.clear(screen.getByLabelText('Nama sumber (opsional)'));
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ sourceName: null }));
});

test('POST maps FE fields to snake_case and returns sourceName', async () => {
  const fetch = mockResponse(wireItem);
  const result = await api.createJunkItem({
    title: item.title,
    category: item.category,
    contentText: item.contentText,
    sourceUrl: item.sourceUrl,
    sourceName: item.sourceName,
    tags: item.tags,
  });
  expect(result.sourceName).toBe('YouTube');
  expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toEqual({
    title: item.title,
    category: item.category,
    content_text: item.contentText,
    source_url: item.sourceUrl,
    source_name: 'YouTube',
    tags: item.tags,
  });
});

test('PATCH preserves omitted fields and sends explicit null when clearing source name', async () => {
  const fetch = mockResponse(wireItem);
  await api.updateJunkItem(item.code, { title: 'New title' });
  expect(JSON.parse(fetch.mock.calls[0]?.[1].body)).toEqual({ title: 'New title' });
  await api.updateJunkItem(item.code, { sourceName: null });
  expect(JSON.parse(fetch.mock.calls[1]?.[1].body)).toEqual({ source_name: null });
});

test('list sends source_url filter and accepts legacy items without source_name', async () => {
  const { source_name: _name, ...legacy } = wireItem;
  const fetch = mockResponse({ items: [legacy] });
  const results = await api.getJunkItems({ sourceUrl: item.sourceUrl ?? undefined });
  expect(results[0]?.sourceName).toBeNull();
  expect(String(fetch.mock.calls[0]?.[0])).toContain('source_url=');
  expect(String(fetch.mock.calls[0]?.[0])).not.toContain('sourceUrl=');
});
