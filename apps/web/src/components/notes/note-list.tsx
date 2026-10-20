import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { ScrollTable } from '../ui/scroll-table';
import { NoteTags, NoteTypeLabel } from './note-badges';
import type { Note } from '../../features/notes/notes-api';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+42rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_6rem_10rem_minmax(12rem,1fr)_10rem] gap-4`;

export const NoteList = ({
  notes,
  selectedCode,
  toDetail,
}: {
  notes: Note[];
  selectedCode?: string;
  toDetail: (code: string) => string;
}) => (
  <ScrollTable
    asHeading
    columnsLabel='Kolom daftar Notes'
    countLabel={`Menampilkan ${notes.length} catatan`}
    gridClassName={columns}
    headings={(frozenColumn) => (
      <>
        <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Judul / Cuplikan</span>
        <span className='py-3 whitespace-nowrap'>Tipe</span>
        <span className='py-3 whitespace-nowrap'>Kategori</span>
        <span className='py-3 whitespace-nowrap'>Tags</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tanggal disimpan</span>
      </>
    )}
    label='Daftar Notes'
    minWidthClassName={minimumWidth}
  >
    {(frozenColumn) =>
      notes.map((note) => {
        const isSelected = note.code === selectedCode;

        return (
          <li key={note.code} className='border-b border-border last:border-b-0'>
            <Link
              aria-current={isSelected ? 'true' : undefined}
              className={`${columns} group items-stretch transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${isSelected ? 'bg-primary-subtle' : 'bg-surface hover:bg-surface-subtle'}`}
              to={toDetail(note.code)}
            >
              <div
                className={`${frozenColumn} border-l-4 px-4 py-5 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary ${isSelected ? 'border-l-primary bg-primary-subtle' : 'border-l-transparent bg-surface group-hover:bg-surface-subtle'}`}
              >
                <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{note.title}</h3>
                <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>
                  {note.contentText.replace(/\s+/g, ' ').trim()}
                </p>
              </div>
              <div className='py-5'>
                <span className='sr-only'>Tipe: </span>
                <NoteTypeLabel className='text-sm' type={note.type} />
              </div>
              <div className='min-w-0 py-5 text-sm text-ink-muted'>
                <span className='sr-only'>Kategori: </span>
                <span className='break-words'>{note.category}</span>
              </div>
              <div className='min-w-0 py-5'>
                <NoteTags maxRows={3} tags={note.tags} />
              </div>
              <div className='py-5 pr-5 text-sm text-ink-muted'>
                <span className='sr-only'>Tanggal disimpan: </span>
                <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
              </div>
            </Link>
          </li>
        );
      })
    }
  </ScrollTable>
);
