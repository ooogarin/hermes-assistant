import { Link } from 'react-router-dom';
import { formatDate, formatDisplayLabel } from '../../lib/formatting/formatters';
import { TagList } from '../ui/chip';
import { ScrollTable, scrollTableRowClassName, scrollTableTitleClassName } from '../ui/scroll-table';
import { StatusPill } from '../ui/status-pill';
import type { ReadingMaterialListItem } from '../../features/reading/reading-api';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+42rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_8rem_6rem_minmax(12rem,1fr)_10rem] gap-4`;

const ReadingStatusLabel = ({ status }: { status: 'read' | 'unread' }) => (
  <StatusPill tone={status === 'read' ? 'accent' : 'warning'}>
    {status === 'read' ? 'Sudah dibaca' : 'Belum dibaca'}
  </StatusPill>
);

export const ReadingList = ({ items }: { items: ReadingMaterialListItem[] }) => (
  <ScrollTable
    asHeading
    columnsLabel='Kolom daftar Reading'
    countLabel={`Menampilkan ${items.length} bacaan`}
    gridClassName={columns}
    headings={(frozenColumn) => (
      <>
        <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Judul / Cuplikan</span>
        <span className='py-3 whitespace-nowrap'>Genre</span>
        <span className='py-3 whitespace-nowrap'>Level</span>
        <span className='py-3 whitespace-nowrap'>Tags</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tanggal disimpan</span>
      </>
    )}
    label='Daftar Reading'
    minWidthClassName={minimumWidth}
  >
    {(frozenColumn) =>
      items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link className={`${columns} ${scrollTableRowClassName}`} to={`/english/reading/${item.code}`}>
            <div className={`${frozenColumn} ${scrollTableTitleClassName}`}>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{item.title}</h3>
                <ReadingStatusLabel status={item.readingStatus} />
              </div>
              <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>{item.contentExcerpt}</p>
            </div>
            <div className='min-w-0 py-5 text-sm text-ink-muted'>
              <span className='sr-only'>Genre: </span>
              <span className='break-words'>{formatDisplayLabel(item.genre)}</span>
            </div>
            <div className='min-w-0 py-5 text-sm text-ink-muted'>
              <span className='sr-only'>Level: </span>
              <span className='break-words'>{item.level}</span>
            </div>
            <div className='min-w-0 py-5'>
              <TagList tags={item.tags} maxVisible={2} label={`Tag ${item.title}`} />
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
