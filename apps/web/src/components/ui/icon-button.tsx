import { forwardRef } from 'react';
import { Button } from './button';
import type { ButtonHTMLAttributes } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, label, type = 'button', ...props }, ref) => (
    <Button
      aria-label={label}
      className={className}
      icon={children}
      ref={ref}
      size='icon'
      type={type}
      variant='secondary'
      {...props}
    />
  ),
);

IconButton.displayName = 'IconButton';
