import { MoveHorizontal } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export const scrollTableRowClassName =
  'group items-stretch bg-surface transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary';

export const scrollTableTitleClassName =
  'border-l-4 border-l-transparent bg-surface px-4 py-5 transition-colors group-hover:bg-surface-subtle group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-primary';

/**
 * Shadow that marks the frozen column as raised over the scrolled columns.
 *
 * It is an overlay instead of a box shadow because a box shadow fades out at the
 * edges of the element that carries it. Every row carries its own frozen cell, so
 * a box shadow left a gap at every row border and the band read as separate
 * segments. An overlay keeps the full height of the cell, so the bands of the
 * rows meet exactly and the shadow stays even from top to bottom.
 */
const scrollTableFrozenShadowClassName =
  'after:absolute after:inset-y-0 after:-right-4 after:w-4 after:pointer-events-none after:bg-gradient-to-r after:from-ink/10 after:to-transparent';

type ScrollTableProps = {
  /** Renders the rows of the table. */
  children: (frozenColumn: string) => ReactNode;
  /** Accessible name of the column area. */
  columnsLabel: string;
  /** Text shown on the left of the footer. */
  countLabel: string;
  /** Grid template shared by the header row and every row. */
  gridClassName: string;
  /** Exposes the name as a visually hidden heading. */
  asHeading?: boolean;
  /** Cells of the header row. */
  headings: (frozenColumn: string) => ReactNode;
  /** Accessible name of the table. */
  label: string;
  /** Width floor that keeps the columns readable while scrolling. */
  minWidthClassName: string;
};

/**
 * A table whose columns stay readable by scrolling sideways. The first column
 * stays in place, and a hint appears once the table can be scrolled.
 */
export const ScrollTable = ({
  asHeading = false,
  children,
  columnsLabel,
  countLabel,
  gridClassName,
  headings,
  label,
  minWidthClassName,
}: ScrollTableProps) => {
  const headingId = useId();
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

  const frozenColumn = `sticky left-0 z-10 min-w-0 ${overflow.left ? scrollTableFrozenShadowClassName : ''}`;
  const canScroll = overflow.left || overflow.right;

  return (
    <section
      aria-label={asHeading ? undefined : label}
      aria-labelledby={asHeading ? headingId : undefined}
      className='@container min-w-0 overflow-hidden rounded-surface border border-border bg-surface'
    >
      {asHeading ? (
        <h2 className='sr-only' id={headingId}>
          {label}
        </h2>
      ) : null}
      <div className='relative'>
        <section
          ref={scrollRef}
          aria-describedby={canScroll ? hintId : undefined}
          aria-label={columnsLabel}
          className='overflow-x-auto overscroll-x-contain [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary'
          onScroll={measureOverflow}
          tabIndex={canScroll ? 0 : undefined}
        >
          <div
            aria-hidden='true'
            className={`${gridClassName} border-b border-border text-sm font-semibold text-ink-muted`}
          >
            {headings(frozenColumn)}
          </div>
          <ul className={minWidthClassName}>{children(frozenColumn)}</ul>
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
          <span className='inline-flex items-center gap-2' id={hintId}>
            <MoveHorizontal aria-hidden='true' size={16} />
            Geser horizontal untuk melihat semua kolom
          </span>
        ) : null}
      </footer>
    </section>
  );
};
