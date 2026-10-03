import { MoveHorizontal } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const minimumWidth = 'min-w-[calc(clamp(10rem,35cqw,26rem)+45rem)]';
const columns = `grid ${minimumWidth} grid-cols-[clamp(10rem,35cqw,26rem)_9rem_10rem_minmax(12rem,1fr)_10rem] gap-4`;

export const writingRowClassName = `${columns} group items-stretch bg-surface transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`;
export const writingTitleClassName =
  'border-l-4 border-l-transparent bg-surface px-4 py-5 group-hover:bg-surface-subtle group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary';

export const WritingTable = ({
  children,
  countLabel,
  headings,
  label,
}: {
  children: (frozenColumn: string) => ReactNode;
  countLabel: string;
  headings: string[];
  label: string;
}) => {
  const hintId = useId();
  const scrollRef = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measureOverflow = useCallback(() => {
    const element = scrollRef.current;

    if (element === null) {
      return;
    }

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

  const canScroll = overflow.left || overflow.right;
  const frozenColumn = `sticky left-0 z-10 min-w-0 ${overflow.left ? 'shadow-[6px_0_10px_-6px_rgba(0,0,0,0.25)]' : ''}`;

  return (
    <section
      className='@container min-w-0 overflow-hidden rounded-surface border border-border bg-surface'
      aria-label={label}
    >
      <div className='relative'>
        <section
          ref={scrollRef}
          aria-label={`Kolom ${label.toLowerCase()}`}
          aria-describedby={canScroll ? hintId : undefined}
          tabIndex={canScroll ? 0 : undefined}
          onScroll={measureOverflow}
          className='overflow-x-auto overscroll-x-contain [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'
        >
          <div aria-hidden='true' className={`${columns} border-b border-border text-sm font-semibold text-ink-muted`}>
            {headings.map((heading, index) => (
              <span
                key={heading}
                className={
                  index === 0 ? `${frozenColumn} bg-surface px-5 py-3 whitespace-nowrap` : 'py-3 pr-5 whitespace-nowrap'
                }
              >
                {heading}
              </span>
            ))}
          </div>
          <ul className={minimumWidth}>{children(frozenColumn)}</ul>
        </section>
        {overflow.right ? (
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-ink/10 to-transparent'
          />
        ) : null}
      </div>
      <footer className='flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-ink-muted'>
        <span>{countLabel}</span>
        {canScroll ? (
          <p id={hintId} className='flex items-center gap-2'>
            <MoveHorizontal aria-hidden='true' size={16} />
            Geser horizontal untuk melihat semua kolom
          </p>
        ) : null}
      </footer>
    </section>
  );
};
