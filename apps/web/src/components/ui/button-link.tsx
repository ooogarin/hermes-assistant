import { Link } from 'react-router-dom';
import { buttonClassNames } from './button';
import type { ReactNode } from 'react';
import type { LinkProps } from 'react-router-dom';
import type { ButtonSize, ButtonVariant } from './button';

type ButtonLinkProps = Omit<LinkProps, 'children'> & {
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  label: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export const ButtonLink = ({
  className,
  icon,
  iconPosition = 'start',
  label,
  size,
  variant,
  ...props
}: ButtonLinkProps) => (
  <Link className={buttonClassNames({ className, size, variant })} {...props}>
    {iconPosition === 'start' ? icon : null}
    {label}
    {iconPosition === 'end' ? icon : null}
  </Link>
);
