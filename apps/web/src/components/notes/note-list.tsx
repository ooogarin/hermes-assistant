import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { NoteTags, NoteTypeLabel } from './note-badges';
import type { Note } from '../../features/notes/notes-api';

const columns =
  'grid-cols-[8.5rem_minmax(10rem,1fr)_5.5rem_10.5rem] @min-[58rem]:grid-cols-[8.5rem_minmax(14rem,1fr)_6rem_8rem_12rem]';

export const NoteList = ({
  notes,
  selectedCode,
  toDetail,
}: {
  notes: Note[];
  selectedCode?: string;
  toDetail: (code: string) => string;
}) => (
  <section
    className='@container min-w-0 overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='notes-list'
  >
    <h2 id='notes-list' className='sr-only'>
      Daftar Notes
    </h2>
    <div
      aria-hidden='true'
      className={`grid gap-4 border-b border-border px-5 py-3 text-sm font-semibold text-ink-muted ${columns}`}
    >
      <span className='whitespace-nowrap'>Tanggal disimpan</span>
      <span className='whitespace-nowrap'>Judul / Cuplikan</span>
      <span className='whitespace-nowrap'>Tipe</span>
      <span className='hidden whitespace-nowrap @min-[58rem]:block'>Kategori</span>
      <span className='whitespace-nowrap'>Tags</span>
    </div>
    <ul>
      {notes.map((note) => (
        <li key={note.code} className='border-b border-border last:border-b-0'>
          <Link
            aria-current={note.code === selectedCode ? 'true' : undefined}
            className={`block border-l-4 px-4 py-5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${note.code === selectedCode ? 'border-primary bg-primary-subtle' : 'border-transparent hover:bg-surface-subtle'}`}
            to={toDetail(note.code)}
          >
            <div className={`grid items-start gap-3 @min-[58rem]:gap-4 ${columns}`}>
              <time dateTime={note.createdAt} className='text-sm text-ink-muted'>
                {formatDate(note.createdAt)}
              </time>
              <div className='min-w-0'>
                <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{note.title}</h3>
                <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>
                  {note.contentText.replace(/\s+/g, ' ').trim()}
                </p>
              </div>
              <NoteTypeLabel className='text-sm' type={note.type} />
              <span className='hidden min-w-0 truncate text-sm text-ink-muted @min-[58rem]:block' title={note.category}>
                {note.category}
              </span>
              <div className='min-w-0 max-w-64'>
                <NoteTags maxRows={3} tags={note.tags} />
              </div>
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
