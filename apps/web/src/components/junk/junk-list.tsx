import { MoveHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJunkExcerpt, getJunkTitle } from '../../features/junk/junk-display';
import { formatDate } from '../../lib/formatting/formatters';
import { getSourceName } from '../../lib/formatting/source';
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
}) => {
  const scrollRef = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measureOverflow = useCallback(() => {
    const element = scrollRef.current;
    if (element === null) return;
    const left = element.scrollLeft > 1;
    const right = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
    setOverflow((current) => (current.left === left && current.right === right ? current : { left, right }));
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) return;
    measureOverflow();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureOverflow);
    observer?.observe(element);
    window.addEventListener('resize', measureOverflow);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measureOverflow);
    };
  }, [measureOverflow]);

  const frozenColumn = `sticky left-0 z-10 min-w-0 ${overflow.left ? 'shadow-[6px_0_10px_-6px_rgba(0,0,0,0.25)]' : ''}`;
  const canScroll = overflow.left || overflow.right;

  return (
    <section
      className='@container min-w-0 overflow-hidden rounded-surface border border-border bg-surface'
      aria-labelledby='junk-list'
    >
      <h2 id='junk-list' className='sr-only'>
        Daftar Junk
      </h2>
      <div className='relative'>
        <section
          ref={scrollRef}
          aria-label='Kolom daftar Junk'
          aria-describedby={canScroll ? 'junk-scroll-hint' : undefined}
          tabIndex={canScroll ? 0 : undefined}
          onScroll={measureOverflow}
          className='overflow-x-auto overscroll-x-contain [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'
        >
          <div aria-hidden='true' className={`${columns} border-b border-border text-sm font-semibold text-ink-muted`}>
            <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Judul / Cuplikan</span>
            <span className='py-3 whitespace-nowrap'>Sumber</span>
            <span className='py-3 whitespace-nowrap'>Kategori</span>
            <span className='py-3 whitespace-nowrap'>Tags</span>
            <span className='py-3 pr-5 whitespace-nowrap'>Tanggal disimpan</span>
          </div>
          <ul className={minimumWidth}>
            {items.map((item) => {
              const excerpt = getJunkExcerpt(item);
              return (
                <li key={item.code} className='border-b border-border last:border-b-0'>
                  <Link
                    aria-current={item.code === selectedCode ? 'true' : undefined}
                    className={`${columns} group items-stretch transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${item.code === selectedCode ? 'bg-primary-subtle' : 'bg-surface hover:bg-surface-subtle'}`}
                    to={toDetail(item.code)}
                  >
                    <div
                      className={`${frozenColumn} border-l-4 px-4 py-5 group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary ${item.code === selectedCode ? 'border-l-primary bg-primary-subtle' : 'border-l-transparent bg-surface group-hover:bg-surface-subtle'}`}
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
            })}
          </ul>
        </section>
        {overflow.right ? (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-ink/10 to-transparent'
          />
        ) : null}
      </div>
      <footer className='flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-ink-muted'>
        <span>Menampilkan {items.length} item</span>
        {canScroll ? (
          <span id='junk-scroll-hint' className='inline-flex items-center gap-2'>
            <MoveHorizontal aria-hidden='true' size={16} />
            Geser horizontal untuk melihat semua kolom
          </span>
        ) : null}
      </footer>
    </section>
  );
};
