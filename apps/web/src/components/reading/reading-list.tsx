import { MoveHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatDisplayLabel } from '../../lib/formatting/formatters';
import { TagList } from '../ui/chip';
import type { ReadingMaterialListItem } from '../../features/reading/reading-api';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+42rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_8rem_6rem_minmax(12rem,1fr)_10rem] gap-4`;

const ReadingStatusLabel = ({ status }: { status: 'read' | 'unread' }) => (
  <span
    className={
      status === 'read'
        ? 'inline-flex shrink-0 rounded-full border border-primary/25 bg-primary-subtle px-2 py-1 text-xs font-medium text-primary'
        : 'inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700'
    }
  >
    {status === 'read' ? 'Sudah dibaca' : 'Belum dibaca'}
  </span>
);

export const ReadingList = ({ items }: { items: ReadingMaterialListItem[] }) => {
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
      aria-labelledby='reading-list'
    >
      <h2 id='reading-list' className='sr-only'>
        Daftar Reading
      </h2>
      <div className='relative'>
        <section
          ref={scrollRef}
          aria-label='Kolom daftar Reading'
          aria-describedby={canScroll ? 'reading-scroll-hint' : undefined}
          tabIndex={canScroll ? 0 : undefined}
          onScroll={measureOverflow}
          className='overflow-x-auto overscroll-x-contain [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'
        >
          <div aria-hidden='true' className={`${columns} border-b border-border text-sm font-semibold text-ink-muted`}>
            <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Judul / Cuplikan</span>
            <span className='py-3 whitespace-nowrap'>Genre</span>
            <span className='py-3 whitespace-nowrap'>Level</span>
            <span className='py-3 whitespace-nowrap'>Tags</span>
            <span className='py-3 pr-5 whitespace-nowrap'>Tanggal disimpan</span>
          </div>
          <ul className={minimumWidth}>
            {items.map((item) => (
              <li key={item.code} className='border-b border-border last:border-b-0'>
                <Link
                  className={`${columns} group items-stretch bg-surface transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
                  to={`/english/reading/${item.code}`}
                >
                  <div
                    className={`${frozenColumn} border-l-4 border-l-transparent bg-surface px-4 py-5 group-hover:bg-surface-subtle group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary`}
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='line-clamp-2 break-words text-sm font-semibold text-ink'>{item.title}</h3>
                      <ReadingStatusLabel status={item.readingStatus} />
                    </div>
                    <p className='mt-1 line-clamp-3 break-words text-sm leading-6 text-ink-muted'>
                      {item.contentExcerpt}
                    </p>
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
            ))}
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
        <span>Menampilkan {items.length} bacaan</span>
        {canScroll ? (
          <span id='reading-scroll-hint' className='inline-flex items-center gap-2'>
            <MoveHorizontal aria-hidden='true' size={16} />
            Geser horizontal untuk melihat semua kolom
          </span>
        ) : null}
      </footer>
    </section>
  );
};
