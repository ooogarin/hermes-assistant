import { Link } from 'react-router-dom';
import { materialStatusLabels } from '../../features/writing/writing-display';
import { formatDate } from '../../lib/formatting/formatters';
import { ResponsiveTags } from '../ui/responsive-tags';
import { WritingTable, writingRowClassName, writingTitleClassName } from './writing-table';
import type { WritingMaterialListItem } from '../../features/writing/writing-api';

export const WritingList = ({ items }: { items: WritingMaterialListItem[] }) => (
  <WritingTable
    label='Daftar prompt'
    headings={['Prompt / Cuplikan', 'Genre / Level', 'Tulisan', 'Tags', 'Tanggal dibuat']}
    countLabel={`Menampilkan ${items.length} prompt`}
  >
    {(frozenColumn) =>
      items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link className={writingRowClassName} to={`/english/writing/materials/${item.code}`}>
            <div className={`${frozenColumn} ${writingTitleClassName}`}>
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
  </WritingTable>
);
