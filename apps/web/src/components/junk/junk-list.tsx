import { Link } from 'react-router-dom';
import { getJunkExcerpt, getJunkTitle, getSourceHost } from '../../features/junk/junk-display';
import { formatDate } from '../../lib/formatting/formatters';
import { JunkCategoryLabel, JunkTags } from './junk-badges';
import type { JunkItem } from '../../features/junk/junk-api';

const Header = () => (
  <div className='hidden grid-cols-[7rem_minmax(12rem,2fr)_9rem_8rem_6.5rem_9rem] gap-4 border-b border-border px-4 py-3 text-xs font-medium text-ink-muted xl:grid'>
    <span>Kategori</span>
    <span>Judul / Cuplikan</span>
    <span>Tags</span>
    <span>Sumber</span>
    <span>Tanggal</span>
    <span>Kode</span>
  </div>
);

export const JunkList = ({
  items,
  selectedCode,
  toDetail,
}: {
  items: JunkItem[];
  selectedCode?: string;
  toDetail: (code: string) => string;
}) => (
  <section className='overflow-hidden rounded-surface border border-border bg-surface' aria-labelledby='junk-list'>
    <h2 id='junk-list' className='sr-only'>
      Daftar Junk
    </h2>
    <Header />
    <ul>
      {items.map((item) => {
        const excerpt = getJunkExcerpt(item);
        const sourceHost = getSourceHost(item.sourceUrl);

        return (
          <li key={item.code} className='border-b border-border last:border-b-0'>
            <Link
              className={
                item.code === selectedCode
                  ? 'block border-l-4 border-primary bg-primary-subtle px-4 py-4'
                  : 'block border-l-4 border-transparent px-4 py-4 transition-colors hover:bg-surface-subtle'
              }
              to={toDetail(item.code)}
            >
              <div className='grid gap-4 xl:grid-cols-[7rem_minmax(12rem,2fr)_9rem_8rem_6.5rem_9rem] xl:items-center'>
                <JunkCategoryLabel category={item.category} />
                <div className='min-w-0'>
                  <h3 className='text-sm font-semibold text-ink'>{getJunkTitle(item)}</h3>
                  {excerpt === null ? null : <p className='mt-1 text-sm leading-6 text-ink-muted'>{excerpt}</p>}
                </div>
                <JunkTags tags={item.tags} />
                <span className='text-sm text-ink-muted'>{sourceHost ?? '—'}</span>
                <span className='text-sm text-ink-muted'>{formatDate(item.createdAt)}</span>
                <span className='text-sm text-ink-muted'>{item.code}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
    <footer className='border-t border-border px-5 py-4 text-xs text-ink-muted'>
      Menampilkan 1–{items.length} dari {items.length} item
    </footer>
  </section>
);
