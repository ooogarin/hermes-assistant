import { render, screen, within } from '@testing-library/react';
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
  content: 'A short reminder to protect focused work blocks.',
  type: 'fact',
  category: 'Knowledge',
  source: 'https://example.org/article',
  sourceContext: null,
  sourceReference: null,
  tags: ['focus', 'habits', 'work'],
  createdAt: '2026-09-08T09:00:00.000Z',
  updatedAt: '2026-09-09T09:00:00.000Z',
  deletedAt: null,
};

const wireNote = {
  code: note.code,
  title: note.title,
  content: note.content,
  type: note.type,
  category: note.category,
  source: note.source,
  source_context: note.sourceContext,
  source_reference: note.sourceReference,
  tags: note.tags,
  created_at: note.createdAt,
  updated_at: note.updatedAt,
  deleted_at: note.deletedAt,
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

test('lists notes date first with a short excerpt and tags, without a code column', () => {
  render(
    <MemoryRouter>
      <NoteList notes={[note]} selectedCode={note.code} toDetail={(code) => `/notes?preview=${code}`} />
    </MemoryRouter>,
  );
  const row = screen.getByRole('link');
  expect(row).toHaveAttribute('aria-current', 'true');
  expect(row.querySelector('time')).toHaveTextContent('8 Sep 2026');
  expect(screen.getByText(note.content)).toHaveClass('line-clamp-3');
  expect(within(screen.getByRole('list', { name: 'Tag catatan' })).getAllByRole('listitem')).toHaveLength(3);
  expect(screen.queryByText(note.code)).not.toBeInTheDocument();
  expect(row).toHaveTextContent('Fact');
  expect(row).toHaveTextContent('Knowledge');
});

test('shows the source as plain text and copies the note code from the detail', async () => {
  const user = userEvent.setup();
  render(<NoteDetailPane note={note} mode='page' />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(note.title);
  expect(screen.getByText(note.source ?? '')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: note.source ?? '' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Salin kode' }));
  expect(await navigator.clipboard.readText()).toBe(note.code);
  expect(screen.getByText('Berhasil disalin')).toBeInTheDocument();
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
