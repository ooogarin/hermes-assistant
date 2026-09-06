import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { NoteTags, NoteTypeLabel } from './note-badges';
import type { Note } from '../../features/notes/notes-api';

const excerpt = (content: string): string => (content.length > 150 ? `${content.slice(0, 150)}…` : content);

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
    <div className='border-b border-border px-5 py-4 sm:px-6'>
      <h2 id='notes-list' className='text-sm font-medium text-ink-muted'>
        Catatan
      </h2>
    </div>
    <ul>
      {notes.map((note) => (
        <li key={note.code} className='border-b border-border last:border-b-0'>
          <Link
            className={
              note.code === selectedCode
                ? 'block border-l-4 border-primary bg-primary-subtle px-5 py-5 sm:px-6'
                : 'block border-l-4 border-transparent px-5 py-5 transition-colors hover:bg-surface-subtle sm:px-6'
            }
            to={toDetail(note.code)}
          >
            <NoteTypeLabel type={note.type} />
            <h3 className='mt-1 text-base font-semibold text-ink'>{note.title}</h3>
            <p className='mt-1 text-sm leading-6 text-ink-muted'>{excerpt(note.content)}</p>
            <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
              <NoteTags tags={note.tags} />
              <p className='shrink-0 text-xs text-ink-muted'>
                {formatDate(note.createdAt)} · {note.code}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
