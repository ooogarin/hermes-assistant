import { CollectionSkeleton, Skeleton } from '../feedback/skeleton';

export const FinanceReportSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <div className='space-y-5' aria-label='Memuat laporan keuangan' aria-busy='true' role='status'>
    {compact ? null : (
      <div className='grid overflow-hidden rounded-surface border border-border bg-surface sm:grid-cols-3'>
        {['expense', 'income', 'net'].map((key) => (
          <div
            key={key}
            className='border-b border-border p-6 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0'
          >
            <Skeleton className='h-4 w-24' />
            <Skeleton className='mt-5 h-8 w-44' />
          </div>
        ))}
      </div>
    )}
    <CollectionSkeleton rows={5} />
  </div>
);
