import { Link } from 'react-router-dom';
import { materialStatusLabels } from '../../features/writing/writing-display';
import { formatDate } from '../../lib/formatting/formatters';
import { ResponsiveTags } from '../ui/responsive-tags';
import { ScrollTable, scrollTableRowClassName, scrollTableTitleClassName } from '../ui/scroll-table';
import type { WritingMaterialListItem } from '../../features/writing/writing-api';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+45rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_9rem_10rem_minmax(12rem,1fr)_10rem] gap-4`;

export const WritingList = ({ items }: { items: WritingMaterialListItem[] }) => (
  <ScrollTable
    columnsLabel='Kolom daftar prompt'
    countLabel={`Menampilkan ${items.length} prompt`}
    gridClassName={columns}
    headings={(frozenColumn) => (
      <>
        <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Prompt / Cuplikan</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Genre / Level</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tulisan</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tags</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tanggal dibuat</span>
      </>
    )}
    label='Daftar prompt'
    minWidthClassName={minimumWidth}
  >
    {(frozenColumn) =>
      items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link className={`${columns} ${scrollTableRowClassName}`} to={`/english/writing/materials/${item.code}`}>
            <div className={`${frozenColumn} ${scrollTableTitleClassName}`}>
              <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{item.topic}</h3>
              <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>{item.promptExcerpt}</p>
              <p className='mt-2 text-xs text-ink-muted'>Target {item.targetWordCount} kata</p>
            </div>
            <div className='min-w-0 space-y-2 py-5 text-sm text-ink-muted'>
              <p className='break-words'>
                <span className='sr-only'>Genre: </span>
                {item.genre}
              </p>
              <p>
                <span className='sr-only'>Level: </span>
                {item.level}
              </p>
            </div>
            <div className='min-w-0 space-y-2 py-5 text-sm text-ink-muted'>
              <p className={item.status === 'reviewed' ? 'font-medium text-primary' : undefined}>
                {materialStatusLabels[item.status]}
              </p>
              <p>{item.submissionCount} tulisan</p>
              {item.submissionCount > 0 ? (
                <p className='text-xs leading-5'>
                  {item.analyzedSubmissionCount} dianalisis · {item.unanalyzedSubmissionCount} belum
                </p>
              ) : null}
            </div>
            <div className='min-w-0 py-5'>
              {item.tags.length ? (
                <ResponsiveTags label={`Tag ${item.topic}`} tags={item.tags} maxRows={3} />
              ) : (
                <span className='text-sm text-ink-muted'>—</span>
              )}
            </div>
            <div className='py-5 pr-5 text-sm text-ink-muted'>
              <span className='sr-only'>Tanggal dibuat: </span>
              <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            </div>
          </Link>
        </li>
      ))
    }
  </ScrollTable>
);
