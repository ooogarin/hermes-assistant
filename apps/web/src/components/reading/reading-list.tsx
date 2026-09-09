import { BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import type { ReadingMaterialListItem } from '../../features/reading/reading-api';

const Status = ({ status }: { status: ReadingMaterialListItem['status'] }) => (
  <span
    className={
      status === 'completed'
        ? 'inline-flex rounded-control border border-primary/40 bg-primary-subtle px-2 py-1 text-xs font-medium text-primary'
        : 'inline-flex rounded-control border border-amber-400 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700'
    }
  >
    {status === 'completed' ? 'Selesai' : 'Belum dijawab'}
  </span>
);

const Tags = ({ tags }: { tags: string[] }) => (
  <div className='flex flex-wrap gap-1.5'>
    {tags.map((tag) => (
      <span
        key={tag}
        className='rounded-control border border-primary/20 bg-primary-subtle px-2 py-0.5 text-xs text-primary'
      >
        {tag}
      </span>
    ))}
  </div>
);

export const ReadingList = ({ items }: { items: ReadingMaterialListItem[] }) => (
  <section
    className='overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='reading-materials'
  >
    <h2 id='reading-materials' className='sr-only'>
      Materi Reading
    </h2>
    <div className='hidden grid-cols-[minmax(13rem,2fr)_6rem_4rem_7rem_minmax(9rem,1fr)_7rem_8rem_8rem_10rem_2rem] gap-4 border-b border-border px-5 py-3 text-xs font-medium text-ink-muted xl:grid'>
      <span>Topik</span>
      <span>Genre</span>
      <span>Level</span>
      <span>Detail</span>
      <span>Tags</span>
      <span>Dibuat</span>
      <span>Sumber</span>
      <span>Status</span>
      <span>Kode</span>
      <span />
    </div>
    <ul>
      {items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link
            className='block px-5 py-5 transition-colors hover:bg-surface-subtle'
            to={`/english/reading/${item.code}`}
          >
            <div className='grid gap-4 xl:grid-cols-[minmax(13rem,2fr)_6rem_4rem_7rem_minmax(9rem,1fr)_7rem_8rem_8rem_10rem_2rem] xl:items-center'>
              <div className='flex min-w-0 items-center gap-3'>
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-ink-muted'>
                  <BookOpen aria-hidden='true' size={19} />
                </span>
                <span className='font-semibold text-ink'>{item.topic}</span>
              </div>
              <span className='text-sm text-ink-muted'>{item.genre}</span>
              <span className='text-sm text-ink-muted'>{item.level}</span>
              <span className='text-sm text-ink-muted'>{item.wordCount} kata</span>
              <Tags tags={item.tags} />
              <span className='text-sm text-ink-muted'>{formatDate(item.createdAt)}</span>
              <span className='text-sm text-ink-muted'>{item.source === 'cron' ? 'Daily practice' : 'Request'}</span>
              <Status status={item.status} />
              <span className='text-sm text-ink-muted'>{item.code}</span>
              <ChevronRight aria-hidden='true' className='hidden text-ink-muted xl:block' size={18} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
