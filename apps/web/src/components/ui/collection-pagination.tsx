import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

type CollectionPaginationProps = {
  itemCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  totalPages: number;
};

export const CollectionPagination = ({
  itemCount,
  limit,
  onPageChange,
  page,
  total,
  totalPages,
}: CollectionPaginationProps) => {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = total === 0 ? 0 : first + itemCount - 1;

  return (
    <footer className='flex flex-col gap-4 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between'>
      <p>
        Menampilkan {first}–{last} dari {total} materi
      </p>
      <div className='flex items-center gap-2'>
        <Button
          disabled={page <= 1}
          icon={<ChevronLeft aria-hidden='true' size={17} />}
          label='Sebelumnya'
          onClick={() => onPageChange(page - 1)}
          variant='secondary'
        />
        <span className='inline-flex size-11 items-center justify-center rounded-control border border-primary bg-primary-subtle font-semibold text-primary'>
          {page}
        </span>
        <Button
          disabled={page >= totalPages}
          icon={<ChevronRight aria-hidden='true' size={17} />}
          iconPosition='end'
          label='Berikutnya'
          onClick={() => onPageChange(page + 1)}
          variant='secondary'
        />
      </div>
    </footer>
  );
};
