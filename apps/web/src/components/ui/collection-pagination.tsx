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
        <Button variant='secondary' disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden='true' size={17} />
          Sebelumnya
        </Button>
        <span className='inline-flex size-11 items-center justify-center rounded-control border border-primary bg-primary-subtle font-semibold text-primary'>
          {page}
        </span>
        <Button variant='secondary' disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya
          <ChevronRight aria-hidden='true' size={17} />
        </Button>
      </div>
    </footer>
  );
};
