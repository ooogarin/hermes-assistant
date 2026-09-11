import { forwardRef } from 'react';
import { classNames } from '../../lib/class-names';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonContent =
  | { children: ReactNode; icon?: never; label?: never }
  | { children?: never; icon?: ReactNode; label: ReactNode }
  | { 'aria-label': string; children?: never; icon: ReactNode; label?: never };

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> &
  ButtonContent & {
    iconPosition?: 'start' | 'end';
    pending?: boolean;
    pendingLabel?: string;
    size?: ButtonSize;
    variant?: ButtonVariant;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-white hover:bg-primary-strong',
  secondary: 'border-border-strong bg-surface text-ink hover:bg-surface-subtle',
  danger: 'border-danger bg-danger text-white hover:opacity-90',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-subtle',
};

const sizeClasses: Record<ButtonSize, string> = {
  icon: 'size-11 p-0',
  md: 'min-h-11 px-4 py-2',
  sm: 'min-h-9 px-3 py-1.5',
};

export const buttonClassNames = ({
  className,
  size = 'md',
  variant = 'primary',
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) =>
  classNames(
    'inline-flex items-center justify-center gap-2 rounded-control border text-sm font-semibold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55',
    sizeClasses[size],
    variantClasses[variant],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      icon,
      iconPosition = 'start',
      label,
      pending = false,
      pendingLabel = 'Memproses…',
      size = 'md',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => {
    const content = children ?? label;

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassNames({ className, size, variant })}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        {...props}
      >
        {pending ? (
          pendingLabel
        ) : (
          <>
            {iconPosition === 'start' ? icon : null}
            {content}
            {iconPosition === 'end' ? icon : null}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
