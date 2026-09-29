import { useLayoutEffect, useRef, useState } from 'react';
import { Chip } from './chip';

const TagChip = ({ tag }: { tag: string }) => (
  <Chip className='min-h-0 max-w-full min-w-0 shrink-0 rounded-control px-2 py-0.5 text-xs'>
    <span className='break-all'>{tag}</span>
  </Chip>
);

const withOccurrenceKeys = (tags: string[]) => {
  const occurrences = new Map<string, number>();
  return tags.map((tag) => {
    const occurrence = occurrences.get(tag) ?? 0;
    occurrences.set(tag, occurrence + 1);
    return { key: `${tag}:${occurrence}`, tag };
  });
};

export const ResponsiveTags = ({ label, maxRows, tags }: { label: string; maxRows?: number; tags: string[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measuringListRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useLayoutEffect(() => {
    if (maxRows === undefined || tags.length === 0) return;
    const container = containerRef.current;
    const probe = measuringListRef.current;
    if (container === null || probe === null) return;

    const measure = () => {
      const width = container.clientWidth;
      if (width === 0) {
        setVisibleCount(tags.length);
        return;
      }
      const tagElements = Array.from(probe.querySelectorAll<HTMLElement>('[data-probe-tag]'));
      const overflowMarker = probe.querySelector<HTMLElement>('[data-probe-overflow]');
      const itemWidths = tagElements.map((element) => element.getBoundingClientRect().width);
      const gap = Number.parseFloat(window.getComputedStyle(probe).columnGap) || 0;
      const markerWidth = overflowMarker?.getBoundingClientRect().width ?? 0;
      const rowsFor = (count: number, withOverflow: boolean): number => {
        let rows = 1;
        let rowWidth = 0;
        for (const itemWidth of [...itemWidths.slice(0, count), ...(withOverflow ? [markerWidth] : [])]) {
          const nextWidth = rowWidth === 0 ? itemWidth : rowWidth + gap + itemWidth;
          if (rowWidth > 0 && nextWidth > width) {
            rows += 1;
            rowWidth = itemWidth;
          } else {
            rowWidth = nextWidth;
          }
        }
        return rows;
      };
      let count = tags.length;
      if (rowsFor(count, false) > maxRows && overflowMarker !== null) {
        count = 1;
        for (let candidate = tags.length - 1; candidate >= 1; candidate -= 1) {
          if (rowsFor(candidate, true) <= maxRows) {
            count = candidate;
            break;
          }
        }
      }
      setVisibleCount((current) => (current === count ? current : count));
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());
    observer?.observe(container);
    if (observer === null) window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [maxRows, tags]);

  if (tags.length === 0) return null;
  const limited = maxRows !== undefined;
  const keyedTags = withOccurrenceKeys(tags);
  const visible = limited ? keyedTags.slice(0, visibleCount) : keyedTags;
  const hidden = keyedTags.length - visible.length;

  return (
    <div ref={containerRef} className='relative min-w-0'>
      <ul aria-label={label} className='flex min-w-0 flex-wrap gap-1.5'>
        {visible.map(({ key, tag }) => (
          <li key={key} className='min-w-0 max-w-full'>
            <TagChip tag={tag} />
          </li>
        ))}
        {hidden > 0 ? (
          <li
            className='shrink-0 self-center whitespace-nowrap text-xs text-ink-muted'
            aria-label={`${hidden} tag lainnya`}
          >
            +{hidden}
          </li>
        ) : null}
      </ul>
      {limited ? (
        <ul
          ref={measuringListRef}
          aria-hidden='true'
          className='invisible pointer-events-none absolute left-0 top-0 flex w-full min-w-0 flex-wrap gap-1.5'
        >
          {keyedTags.map(({ key, tag }) => (
            <li key={key} data-probe-tag className='min-w-0 max-w-full'>
              <TagChip tag={tag} />
            </li>
          ))}
          <li data-probe-overflow className='shrink-0 self-center whitespace-nowrap text-xs'>
            +{tags.length}
          </li>
        </ul>
      ) : null}
    </div>
  );
};
