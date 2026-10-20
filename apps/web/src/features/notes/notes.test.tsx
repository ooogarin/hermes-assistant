import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { NoteActions } from '../../components/notes/note-actions';
import { NoteDetailPane } from '../../components/notes/note-detail-pane';
import { NoteList } from '../../components/notes/note-list';
import { ResponsiveTags } from '../../components/ui/responsive-tags';
import NotesDetailPage from './detail/page';
import NotesListPage from './list/page';
import * as api from './notes-api';
import type { Note } from './notes-api';

const note: Note = {
  code: 'NT-20260908-001',
  title: 'Focus is a skill',
  contentText: 'A short reminder to protect focused work blocks.',
  rawText: '  Original reminder\n',
  type: 'fact',
  category: 'Knowledge',
  sourceName: 'Example Journal',
  sourceUrl: 'https://example.org/article',
  sourceContext: null,
  sourceReference: null,
  tags: ['focus', 'habits', 'work'],
  createdAt: '2026-09-08T09:00:00.000Z',
  updatedAt: '2026-09-09T09:00:00.000Z',
};

const wireNote = {
  code: note.code,
  title: note.title,
  content_text: note.contentText,
  raw_text: note.rawText,
  type: note.type,
  category: note.category,
  source_name: note.sourceName,
  source_url: note.sourceUrl,
  source_context: note.sourceContext,
  source_reference: note.sourceReference,
  tags: note.tags,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
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

test('lists notes title first with all metadata, a short excerpt and tags, without a code column', () => {
  render(
    <MemoryRouter>
      <NoteList notes={[note]} selectedCode={note.code} toDetail={(code) => `/notes?preview=${code}`} />
    </MemoryRouter>,
  );
  const row = screen.getByRole('link');
  expect(row).toHaveAttribute('aria-current', 'true');
  expect(row.firstElementChild).toContainElement(screen.getByRole('heading', { name: note.title }));
  expect(row).toHaveAttribute('href', `/notes?preview=${note.code}`);
  expect(row.querySelector('time')).toHaveTextContent('8 Sep 2026');
  expect(screen.getByText(note.contentText)).toHaveClass('line-clamp-3');
  expect(within(screen.getByRole('list', { name: 'Tag catatan' })).getAllByRole('listitem')).toHaveLength(3);
  expect(screen.queryByText(note.code)).not.toBeInTheDocument();
  expect(row).toHaveTextContent('Fact');
  expect(row).toHaveTextContent('Knowledge');
});

test('changes the frozen column background together with the row', () => {
  render(
    <MemoryRouter>
      <NoteList notes={[note]} toDetail={(code) => `/notes?preview=${code}`} />
    </MemoryRouter>,
  );
  const row = screen.getByRole('link');

  expect(row).toHaveClass('transition-colors');
  expect(row.firstElementChild).toHaveClass('transition-colors');
});

test('offers keyboard access and overflow guidance only while the columns exceed the list width', () => {
  let width = 640;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.getAttribute('aria-label') === 'Kolom daftar Notes' ? width : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(960);
  render(
    <MemoryRouter>
      <NoteList notes={[note]} toDetail={(code) => `/notes?preview=${code}`} />
    </MemoryRouter>,
  );
  const region = screen.getByRole('region', { name: 'Kolom daftar Notes' });
  expect(region).toHaveAttribute('tabindex', '0');
  expect(region).toHaveAccessibleDescription('Geser horizontal untuk melihat semua kolom');
  expect(within(region).getByText(note.category)).toBeInTheDocument();
  fireEvent.scroll(region, { target: { scrollLeft: 320 } });
  expect(region).toHaveAttribute('tabindex', '0');
  width = 960;
  fireEvent.scroll(region, { target: { scrollLeft: 0 } });
  expect(region).not.toHaveAttribute('tabindex');
  expect(screen.queryByText('Geser horizontal untuk melihat semua kolom')).not.toBeInTheDocument();
});

test('opens and copies the source URL, switches original text, and copies the note code', async () => {
  const user = userEvent.setup();
  render(<NoteDetailPane note={note} mode='page' />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(note.title);
  expect(screen.getByRole('link', { name: /Example Journal/ })).toHaveAttribute('href', note.sourceUrl);
  await user.click(screen.getByRole('button', { name: 'Salin tautan' }));
  expect(await navigator.clipboard.readText()).toBe(note.sourceUrl);
  await user.click(screen.getByRole('switch', { name: /Teks asli/ }));
  expect(screen.getByRole('article', { name: 'Teks asli' })).toHaveTextContent('Original reminder');
  await user.click(screen.getByRole('button', { name: 'Salin kode' }));
  expect(await navigator.clipboard.readText()).toBe(note.code);
  expect(screen.getAllByText('Berhasil disalin')).toHaveLength(2);
});

test('tag overflow uses all three available rows before showing +N', () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(160);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return DOMRect.fromRect({ width: this.hasAttribute('data-probe-overflow') ? 25 : 70 });
  });
  render(
    <ResponsiveTags label='Tag catatan' maxRows={3} tags={Array.from({ length: 8 }, (_, index) => `tag-${index}`)} />,
  );
  expect(within(screen.getByRole('list', { name: 'Tag catatan' })).getAllByRole('listitem')).toHaveLength(6);
  expect(screen.getByLabelText('3 tag lainnya')).toHaveTextContent('+3');
});

test('preview opens the full detail and returns with search context intact', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => {
      const data = path.startsWith('/api/v1/notes?') ? { items: [wireNote] } : wireNote;
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }),
  );
  render(
    <MemoryRouter initialEntries={['/notes?q=focus']}>
      <Routes>
        <Route path='/notes' element={<NotesListPage />} />
        <Route path='/notes/:code' element={<NotesDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const row = await screen.findByRole('link', { name: /Focus is a skill/ });
  await user.click(row);
  const preview = await screen.findByRole('complementary', { name: 'Detail Focus is a skill' });
  await user.click(within(preview).getByRole('button', { name: 'Aksi Notes' }));
  expect(within(preview).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', `/notes/${note.code}/edit`);
  await user.click(within(preview).getByRole('button', { name: 'Buka halaman detail' }));
  expect(await screen.findByRole('heading', { level: 1, name: note.title })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Kembali ke Notes' }));
  expect(await screen.findByRole('button', { name: 'Tutup preview' })).toBeInTheDocument();
  expect(screen.getByDisplayValue('focus')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tutup preview' }));
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('focus')).toBeInTheDocument();
});

test('preview actions require confirmation before deleting a note', async () => {
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
  const remove = vi.spyOn(api, 'deleteNote').mockResolvedValue();
  const onDeleted = vi.fn();
  render(
    <MemoryRouter>
      <NoteActions note={note} onDeleted={onDeleted} />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: 'Aksi Notes' }));
  await user.click(screen.getByRole('button', { name: 'Hapus' }));
  expect(remove).not.toHaveBeenCalled();
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hapus' }));
  expect(remove).toHaveBeenCalledWith(note.code);
  expect(onDeleted).toHaveBeenCalledOnce();
});

test('sends category and tag filters unchanged because the server normalizes them', async () => {
  const fetch = vi.fn(
    async (_path: string) => new Response(JSON.stringify({ success: true, data: { items: [] } }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetch);

  await api.getNotes({ category: 'Tech/Programming', tag: 'Postgres' });

  const requestedPath = String(fetch.mock.calls[0]?.[0]);
  expect(requestedPath).toContain('category=Tech%2FProgramming');
  expect(requestedPath).toContain('tag=Postgres');
});
