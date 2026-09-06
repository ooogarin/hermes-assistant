import { forwardRef } from 'react';
import { classNames } from '../../lib/class-names';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-white hover:bg-primary-strong',
  secondary: 'border-border-strong bg-surface text-ink hover:bg-surface-subtle',
  danger: 'border-danger bg-danger text-white hover:opacity-90',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-subtle',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, disabled, pending = false, type = 'button', variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={classNames(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-4 py-2 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variantClasses[variant],
        className,
      )}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? 'Memproses…' : children}
    </button>
  ),
);

Button.displayName = 'Button';
