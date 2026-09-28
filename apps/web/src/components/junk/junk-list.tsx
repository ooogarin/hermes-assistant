import { Link } from 'react-router-dom';
import { getJunkExcerpt, getJunkTitle, getSourceName } from '../../features/junk/junk-display';
import { formatDate } from '../../lib/formatting/formatters';
import { JunkCategoryLabel, JunkTags } from './junk-badges';
import type { JunkItem } from '../../features/junk/junk-api';

const columns =
  'grid-cols-[8.5rem_minmax(10rem,1fr)_5.5rem_10.5rem] @min-[58rem]:grid-cols-[8.5rem_minmax(14rem,1fr)_7rem_6rem_12rem]';
export const JunkList = ({
  items,
  selectedCode,
  toDetail,
}: {
  items: JunkItem[];
  selectedCode?: string;
  toDetail: (code: string) => string;
}) => (
  <section
    className='@container min-w-0 overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='junk-list'
  >
    <h2 id='junk-list' className='sr-only'>
      Daftar Junk
    </h2>
    <div
      aria-hidden='true'
      className={`grid gap-4 border-b border-border px-5 py-3 text-sm font-semibold text-ink-muted ${columns}`}
    >
      <span className='whitespace-nowrap'>Tanggal disimpan</span>
      <span className='whitespace-nowrap'>Judul / Cuplikan</span>
      <span className='hidden whitespace-nowrap @min-[58rem]:block'>Sumber</span>
      <span className='whitespace-nowrap'>Kategori</span>
      <span className='whitespace-nowrap'>Tags</span>
      <span />
    </div>
    <ul>
      {items.map((item) => {
        const excerpt = getJunkExcerpt(item);
        return (
          <li key={item.code} className='border-b border-border last:border-b-0'>
            <Link
              to={toDetail(item.code)}
              aria-current={item.code === selectedCode ? 'true' : undefined}
              className={`block border-l-4 px-4 py-5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${item.code === selectedCode ? 'border-primary bg-primary-subtle' : 'border-transparent hover:bg-surface-subtle'}`}
            >
              <div className={`grid items-start gap-3 @min-[58rem]:gap-4 ${columns}`}>
                <time dateTime={item.createdAt} className='text-sm text-ink-muted'>
                  {formatDate(item.createdAt)}
                </time>
                <div className='min-w-0'>
                  <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{getJunkTitle(item)}</h3>
                  {excerpt === null ? null : (
                    <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>{excerpt}</p>
                  )}
                </div>
                <span
                  className='hidden min-w-0 truncate text-sm text-ink-muted @min-[58rem]:block'
                  title={getSourceName(item) ?? undefined}
                >
                  <span className='@min-[58rem]:sr-only'>Sumber: </span>
                  {getSourceName(item) ?? '—'}
                </span>
                <JunkCategoryLabel category={item.category} />
                <div className='min-w-0 max-w-64'>
                  <JunkTags tags={item.tags} maxRows={3} />
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
    <footer className='border-t border-border px-5 py-4 text-xs text-ink-muted'>Menampilkan {items.length} item</footer>
  </section>
);
