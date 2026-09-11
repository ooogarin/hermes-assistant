import type { ReactNode } from 'react';

type PageHeaderProps = {
  actions?: ReactNode;
  eyebrow?: ReactNode;
  title: string;
};

export const PageHeader = ({ actions, eyebrow, title }: PageHeaderProps) => (
  <header className='flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between'>
    <div>
      {eyebrow === undefined ? null : <div className='mb-5 text-sm font-medium text-primary'>{eyebrow}</div>}
      <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>{title}</h1>
    </div>
    {actions === undefined ? null : <div className='shrink-0'>{actions}</div>}
  </header>
);
