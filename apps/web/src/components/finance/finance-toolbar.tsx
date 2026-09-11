import type { ReactNode } from 'react';

export const FinanceToolbar = ({ actions, controls }: { actions: ReactNode; controls: ReactNode }) => (
  <section
    className='flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'
    aria-label='Kontrol Finance'
  >
    <div className='min-w-0 max-sm:w-full'>{controls}</div>
    <div className='flex flex-wrap items-center gap-3 sm:justify-end'>{actions}</div>
  </section>
);
