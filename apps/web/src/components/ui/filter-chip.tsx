import { classNames } from '../../lib/class-names';
import type { ButtonHTMLAttributes } from 'react';

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export const FilterChip = ({ active, className, type = 'button', ...props }: FilterChipProps) => (
  <button
    className={classNames(
      'inline-flex min-h-9 items-center rounded-control border px-4 text-sm font-medium',
      active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-ink-muted',
      className,
    )}
    type={type}
    {...props}
  />
);
