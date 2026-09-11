import { classNames } from '../../lib/class-names';
import type { ReactNode } from 'react';

export const LearningListCell = ({
  children,
  className,
  hideLabelAt = 'lg',
  label,
}: {
  children: ReactNode;
  className?: string;
  hideLabelAt?: 'lg' | 'xl';
  label: string;
}) => (
  <div className={classNames('min-w-0', className)}>
    <span
      className={classNames(
        'mb-1 block text-xs font-medium text-ink-muted',
        hideLabelAt === 'lg' ? 'lg:hidden' : 'xl:hidden',
      )}
    >
      {label}
    </span>
    {children}
  </div>
);
