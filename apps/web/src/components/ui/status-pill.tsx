import { classNames } from '../../lib/class-names';
import type { ReactNode } from 'react';

type StatusPillProps = {
  children: ReactNode;
  tone: 'accent' | 'warning';
};

const toneClasses = {
  accent: 'border-primary/25 bg-primary-subtle text-primary',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
};

/** A small badge that marks the status of a record. */
export const StatusPill = ({ children, tone }: StatusPillProps) => (
  <span
    className={classNames('inline-flex shrink-0 rounded-full border px-2 py-1 text-xs font-medium', toneClasses[tone])}
  >
    {children}
  </span>
);
