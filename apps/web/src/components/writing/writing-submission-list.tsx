import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { confirmDiscardChanges } from '../../lib/hooks/use-unsaved-changes';
import { ResponsiveTags } from '../ui/responsive-tags';
import { ScrollTable, scrollTableRowClassName, scrollTableTitleClassName } from '../ui/scroll-table';
import { WritingStatusLabel } from './writing-status-label';
import type { WritingSubmissionListItem } from '../../features/writing/writing-api';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+45rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_9rem_10rem_minmax(12rem,1fr)_10rem] gap-4`;

export const WritingSubmissionList = ({ items }: { items: WritingSubmissionListItem[] }) => (
  <ScrollTable
    columnsLabel='Kolom daftar tulisan'
    countLabel={`Menampilkan ${items.length} tulisan`}
    gridClassName={columns}
    headings={(frozenColumn) => (
      <>
        <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Judul / Cuplikan</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Genre</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Level</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tags</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tanggal disimpan</span>
      </>
    )}
    label='Daftar tulisan'
    minWidthClassName={minimumWidth}
  >
    {(frozenColumn) =>
      items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link
            className={`${columns} ${scrollTableRowClassName}`}
            onClick={(event) => {
              if (!confirmDiscardChanges()) {
                event.preventDefault();
              }
            }}
            to={`/english/writing/submissions/${item.code}`}
          >
            <div className={`${frozenColumn} ${scrollTableTitleClassName}`}>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>
                  {item.estimatedTopic ?? item.code}
                </h3>
                <WritingStatusLabel status={item.analysisStatus} />
              </div>
              <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>
                {item.textExcerpt.replace(/\s+/g, ' ').trim()}
              </p>
              <p className='mt-2 text-xs text-ink-muted'>
                {item.materialCode === null ? 'Tulisan bebas' : 'Dari prompt'} · {item.wordCount} kata
              </p>
            </div>
            <div className='min-w-0 space-y-2 py-5 text-sm text-ink-muted'>
              <p className='break-words'>
                <span className='sr-only'>Estimasi genre: </span>
                {item.estimatedGenre ?? '—'}
              </p>
            </div>
            <div className='min-w-0 py-5 text-sm text-ink-muted'>
              <p>
                <span className='sr-only'>Estimasi level: </span>
                {item.estimatedLevel ?? '—'}
              </p>
            </div>
            <div className='min-w-0 py-5'>
              {item.estimatedTags?.length ? (
                <ResponsiveTags label={`Tag ${item.code}`} tags={item.estimatedTags} maxRows={3} />
              ) : (
                <span className='text-sm text-ink-muted'>—</span>
              )}
            </div>
            <div className='py-5 pr-5 text-sm text-ink-muted'>
              <span className='sr-only'>Tanggal disimpan: </span>
              <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            </div>
          </Link>
        </li>
      ))
    }
  </ScrollTable>
);
