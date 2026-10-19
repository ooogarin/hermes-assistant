import { Link } from 'react-router-dom';
import { getJunkExcerpt, getJunkTitle } from '../../features/junk/junk-display';
import { formatDate } from '../../lib/formatting/formatters';
import { getSourceName } from '../../lib/formatting/source';
import { ScrollTable } from '../ui/scroll-table';
import { JunkCategoryLabel, JunkTags } from './junk-badges';
import type { JunkItem } from '../../features/junk/junk-api';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+42rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_6rem_10rem_minmax(12rem,1fr)_10rem] gap-4`;

export const JunkList = ({
  items,
  selectedCode,
  toDetail,
}: {
  items: JunkItem[];
  selectedCode?: string;
  toDetail: (code: string) => string;
}) => (
  <ScrollTable
    asHeading
    columnsLabel='Kolom daftar Junk'
    countLabel={`Menampilkan ${items.length} item`}
    gridClassName={columns}
    headings={(frozenColumn) => (
      <>
        <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Judul / Cuplikan</span>
        <span className='py-3 whitespace-nowrap'>Sumber</span>
        <span className='py-3 whitespace-nowrap'>Kategori</span>
        <span className='py-3 whitespace-nowrap'>Tags</span>
        <span className='py-3 pr-5 whitespace-nowrap'>Tanggal disimpan</span>
      </>
    )}
    label='Daftar Junk'
    minWidthClassName={minimumWidth}
  >
    {(frozenColumn) =>
      items.map((item) => {
        const isSelected = item.code === selectedCode;
        const excerpt = getJunkExcerpt(item);

        return (
          <li key={item.code} className='border-b border-border last:border-b-0'>
            <Link
              aria-current={isSelected ? 'true' : undefined}
              className={`${columns} group items-stretch transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${isSelected ? 'bg-primary-subtle' : 'bg-surface hover:bg-surface-subtle'}`}
              to={toDetail(item.code)}
            >
              <div
                className={`${frozenColumn} border-l-4 px-4 py-5 group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary ${isSelected ? 'border-l-primary bg-primary-subtle' : 'border-l-transparent bg-surface group-hover:bg-surface-subtle'}`}
              >
                <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{getJunkTitle(item)}</h3>
                {excerpt === null ? null : (
                  <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>{excerpt}</p>
                )}
              </div>
              <div className='min-w-0 py-5 text-sm text-ink-muted'>
                <span className='sr-only'>Sumber: </span>
                <span className='break-words'>{getSourceName(item) ?? '—'}</span>
              </div>
              <div className='min-w-0 py-5 text-sm text-ink-muted'>
                <span className='sr-only'>Kategori: </span>
                <JunkCategoryLabel category={item.category} />
              </div>
              <div className='min-w-0 py-5'>
                <JunkTags maxRows={3} tags={item.tags} />
              </div>
              <div className='py-5 pr-5 text-sm text-ink-muted'>
                <span className='sr-only'>Tanggal disimpan: </span>
                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
              </div>
            </Link>
          </li>
        );
      })
    }
  </ScrollTable>
);
