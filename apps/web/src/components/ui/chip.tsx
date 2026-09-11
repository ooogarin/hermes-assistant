import { X } from 'lucide-react';
import { classNames } from '../../lib/class-names';
import type { ReactNode } from 'react';

type ChipProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
};

type TagListProps = {
  className?: string;
  label?: string;
  maxVisible?: number;
  tags: string[];
  wrap?: boolean;
};

export const Chip = ({ children, className, disabled, onRemove, removeLabel }: ChipProps) => (
  <span
    className={classNames(
      'inline-flex min-h-7 items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-2.5 text-sm text-primary',
      className,
    )}
  >
    {children}
    {onRemove === undefined ? null : (
      <button
        aria-label={removeLabel ?? `Hapus ${String(children)}`}
        className='rounded-full p-0.5 transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20'
        disabled={disabled}
        onClick={onRemove}
        type='button'
      >
        <X aria-hidden='true' size={14} />
      </button>
    )}
  </span>
);

export const TagList = ({ className, label = 'Tags', maxVisible, tags, wrap = true }: TagListProps) => {
  if (tags.length === 0) return null;

  const visibleTags = maxVisible === undefined ? tags : tags.slice(0, Math.max(0, maxVisible));
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <ul
      aria-label={label}
      className={classNames('flex gap-1.5', wrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden', className)}
    >
      {visibleTags.map((tag) => (
        <li className='min-w-0' key={tag}>
          <Chip className='min-h-0 rounded-control px-2 py-0.5 text-xs'>{tag}</Chip>
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li
          aria-label={`${hiddenCount} tag lainnya`}
          className='shrink-0 self-center text-xs font-medium text-ink-muted'
        >
          +{hiddenCount}
        </li>
      ) : null}
    </ul>
  );
};
