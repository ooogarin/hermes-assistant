import { classNames } from '../../lib/class-names';

export const Skeleton = ({ className }: { className?: string }) => (
  <span className={classNames('block animate-pulse rounded bg-slate-200 motion-reduce:animate-none', className)} />
);

const skeletonRowKeys = ['first', 'second', 'third', 'fourth', 'fifth'];

export const CollectionSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div
    className='overflow-hidden rounded-surface border border-border bg-surface'
    aria-label='Memuat konten'
    aria-busy='true'
    role='status'
  >
    {skeletonRowKeys.slice(0, rows).map((rowKey) => (
      <div key={rowKey} className='flex gap-4 border-b border-border p-5 last:border-b-0'>
        <Skeleton className='size-12 shrink-0' />
        <div className='flex-1 space-y-3'>
          <Skeleton className='h-4 w-2/5' />
          <Skeleton className='h-3 w-4/5' />
        </div>
      </div>
    ))}
  </div>
);
