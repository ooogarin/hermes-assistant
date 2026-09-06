import { forwardRef } from 'react';
import { classNames } from '../../lib/class-names';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, label, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={classNames(
        'inline-flex size-11 items-center justify-center rounded-control border border-border bg-surface text-ink-muted',
        'transition-colors hover:bg-surface-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = 'IconButton';
