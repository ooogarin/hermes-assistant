import { MoveHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  grammarModeLabels,
  grammarSessionStatusLabels,
  grammarSourceLabels,
} from '../../features/grammar/grammar-display';
import { formatDate } from '../../lib/formatting/formatters';
import type { GrammarSessionListItem } from '../../features/grammar/grammar-api';

const minimumWidth = 'min-w-[calc(clamp(9rem,22cqw,14rem)+50rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(9rem,22cqw,14rem)_6rem_8rem_8rem_9rem_7rem_6rem] gap-4`;

const badgeClassName = 'inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium';
const primaryBadgeClassName = `${badgeClassName} border-primary/25 bg-primary-subtle text-primary`;
const neutralBadgeClassName = `${badgeClassName} border-border bg-surface-subtle text-ink-muted`;
const warningBadgeClassName = `${badgeClassName} border-amber-200 bg-amber-50 text-amber-700`;

const GrammarModeBadge = ({ mode }: { mode: GrammarSessionListItem['mode'] }) => (
  <span className={mode === 'practice' ? primaryBadgeClassName : neutralBadgeClassName}>{grammarModeLabels[mode]}</span>
);

const GrammarSessionStatusBadge = ({ status }: { status: GrammarSessionListItem['status'] }) => (
  <span
    className={
      status === 'active'
        ? primaryBadgeClassName
        : status === 'abandoned'
          ? warningBadgeClassName
          : neutralBadgeClassName
    }
  >
    {grammarSessionStatusLabels[status]}
  </span>
);

const scoreLabel = (item: GrammarSessionListItem): string =>
  item.score === null || item.maxScore === null ? '—' : `${item.score}/${item.maxScore}`;

export const GrammarSessionTable = ({ items }: { items: GrammarSessionListItem[] }) => {
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

    if (element === null) {
      return;
    }

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
      aria-label='Daftar sesi Grammar'
    >
      <div className='relative'>
        <section
          ref={scrollRef}
          aria-label='Kolom daftar sesi Grammar'
          aria-describedby={canScroll ? 'grammar-session-scroll-hint' : undefined}
          tabIndex={canScroll ? 0 : undefined}
          onScroll={measureOverflow}
          className='overflow-x-auto overscroll-x-contain [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'
        >
          <div aria-hidden='true' className={`${columns} border-b border-border text-sm font-semibold text-ink-muted`}>
            <span className={`${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap`}>Sesi</span>
            <span className='py-3 whitespace-nowrap'>Mode</span>
            <span className='py-3 whitespace-nowrap'>Tanggal</span>
            <span className='py-3 whitespace-nowrap'>Level</span>
            <span className='py-3 whitespace-nowrap'>Sumber</span>
            <span className='py-3 whitespace-nowrap'>Status</span>
            <span className='py-3 pr-5 whitespace-nowrap'>Skor</span>
          </div>
          <ul className={minimumWidth}>
            {items.map((item) => (
              <li key={item.code} className='border-b border-border last:border-b-0'>
                <Link
                  className={`${columns} group items-stretch bg-surface transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`}
                  to={`/english/grammar/${item.code}`}
                >
                  <div
                    className={`${frozenColumn} border-l-4 border-l-transparent bg-surface px-4 py-5 group-hover:bg-surface-subtle group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary`}
                  >
                    <h3 className='break-words text-sm font-semibold text-ink'>{item.code}</h3>
                  </div>
                  <div className='min-w-0 py-5'>
                    <span className='sr-only'>Mode: </span>
                    <GrammarModeBadge mode={item.mode} />
                  </div>
                  <div className='min-w-0 py-5 text-sm text-ink-muted'>
                    <span className='sr-only'>Tanggal mulai: </span>
                    <time dateTime={item.startedAt}>{formatDate(item.startedAt)}</time>
                  </div>
                  <div className='min-w-0 py-5 text-sm text-ink-muted'>
                    <span className='sr-only'>Level: </span>
                    <span className='break-words'>{item.level}</span>
                  </div>
                  <div className='min-w-0 py-5 text-sm text-ink-muted'>
                    <span className='sr-only'>Sumber: </span>
                    <span className='break-words'>{grammarSourceLabels[item.source]}</span>
                  </div>
                  <div className='min-w-0 py-5'>
                    <span className='sr-only'>Status: </span>
                    <GrammarSessionStatusBadge status={item.status} />
                  </div>
                  <div className='min-w-0 py-5 pr-5 text-sm text-ink-muted'>
                    <span className='sr-only'>Skor: </span>
                    <span className='whitespace-nowrap'>{scoreLabel(item)}</span>
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
        <span>Menampilkan {items.length} sesi</span>
        {canScroll ? (
          <span id='grammar-session-scroll-hint' className='inline-flex items-center gap-2'>
            <MoveHorizontal aria-hidden='true' size={16} />
            Geser horizontal untuk melihat semua kolom
          </span>
        ) : null}
      </footer>
    </section>
  );
};
