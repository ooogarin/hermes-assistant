import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { NoteTags, NoteTypeLabel } from './note-badges';
import type { Note } from '../../features/notes/notes-api';

const excerpt = (content: string): string => (content.length > 150 ? `${content.slice(0, 150)}…` : content);
const noteColumns = 'xl:grid-cols-[6.5rem_minmax(12rem,2fr)_minmax(7rem,1fr)_6.5rem_9rem]';
const compactNoteColumns = 'xl:grid-cols-[5rem_minmax(10rem,2fr)_minmax(6rem,1fr)_5.5rem]';

const Header = ({ compact }: { compact: boolean }) => (
  <div
    className={`hidden gap-3 border-b border-border px-4 py-3 text-xs font-medium text-ink-muted xl:grid ${compact ? compactNoteColumns : noteColumns}`}
  >
    <span>Tipe</span>
    <span>Judul / Cuplikan</span>
    <span>Tags</span>
    <span>Tanggal</span>
    {compact ? null : <span>Kode</span>}
  </div>
);

export const NoteList = ({
  notes,
  selectedCode,
  toDetail,
}: {
  notes: Note[];
  selectedCode?: string;
  toDetail: (code: string) => string;
}) => (
  <section className='overflow-hidden rounded-surface border border-border bg-surface' aria-labelledby='notes-list'>
    <h2 id='notes-list' className='sr-only'>
      Daftar Notes
    </h2>
    <Header compact={selectedCode !== undefined} />
    <ul>
      {notes.map((note) => (
        <li key={note.code} className='border-b border-border last:border-b-0'>
          <Link
            className={
              note.code === selectedCode
                ? 'block border-l-4 border-primary bg-primary-subtle px-4 py-4'
                : 'block border-l-4 border-transparent px-4 py-4 transition-colors hover:bg-surface-subtle'
            }
            to={toDetail(note.code)}
          >
            <div
              className={`grid gap-3 xl:items-start ${selectedCode === undefined ? noteColumns : compactNoteColumns}`}
            >
              <NoteTypeLabel className='text-sm' type={note.type} />
              <div className='min-w-0'>
                <h3 className='text-sm font-semibold text-ink'>{note.title}</h3>
                <p className='mt-1 break-words text-sm leading-6 text-ink-muted'>{excerpt(note.content)}</p>
              </div>
              <div className='min-w-0 self-start'>
                <NoteTags tags={note.tags} />
              </div>
              <span className='whitespace-nowrap text-sm text-ink-muted'>{formatDate(note.createdAt)}</span>
              {selectedCode === undefined ? (
                <span className='whitespace-nowrap text-sm text-ink-muted'>{note.code}</span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
    <footer className='border-t border-border px-5 py-4 text-xs text-ink-muted'>
      Menampilkan {notes.length} catatan
    </footer>
  </section>
);
