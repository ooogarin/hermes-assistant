import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import type { WritingMaterialListItem } from '../../features/writing/writing-api';

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

export const WritingList = ({ items }: { items: WritingMaterialListItem[] }) => (
  <section
    className='overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='writing-materials'
  >
    <h2 id='writing-materials' className='sr-only'>
      Materi Writing
    </h2>
    <div className='hidden grid-cols-[minmax(14rem,2fr)_6rem_4rem_6rem_minmax(9rem,1fr)_7rem_8rem_8rem_10rem_5rem] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase text-ink-muted xl:grid'>
      <span>Topik / prompt</span>
      <span>Genre</span>
      <span>Level</span>
      <span>Target</span>
      <span>Tag</span>
      <span>Tanggal</span>
      <span>Sumber</span>
      <span>Status</span>
      <span>Kode</span>
      <span>Draft</span>
    </div>
    <ul>
      {items.map((item) => {
        const destination =
          item.latestSubmissionNumber === null
            ? `/english/writing/${item.code}`
            : `/english/writing/${item.code}/submissions/${item.latestSubmissionNumber}`;

        return (
          <li key={item.code} className='border-b border-border last:border-b-0'>
            <Link className='block px-5 py-5 transition-colors hover:bg-surface-subtle' to={destination}>
              <div className='grid gap-4 xl:grid-cols-[minmax(14rem,2fr)_6rem_4rem_6rem_minmax(9rem,1fr)_7rem_8rem_8rem_10rem_5rem] xl:items-center'>
                <div className='min-w-0'>
                  <h3 className='font-semibold text-ink'>{item.topic}</h3>
                  <p className='mt-1 line-clamp-2 text-sm leading-6 text-ink-muted'>{item.promptExcerpt}</p>
                  {item.status === 'unsubmitted' ? (
                    <span className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary'>
                      Mulai menulis <ArrowRight aria-hidden='true' size={15} />
                    </span>
                  ) : null}
                </div>
                <span className='text-sm text-ink-muted'>{item.genre}</span>
                <span className='text-sm text-ink-muted'>{item.level}</span>
                <span className='text-sm text-ink-muted'>{item.targetWordCount} kata</span>
                <Tags tags={item.tags} />
                <span className='text-sm text-ink-muted'>{formatDate(item.createdAt)}</span>
                <span className='text-sm text-ink-muted'>{item.source === 'cron' ? 'Daily practice' : 'Request'}</span>
                <span
                  className={item.status === 'reviewed' ? 'text-sm font-medium text-primary' : 'text-sm text-amber-700'}
                >
                  {item.status === 'reviewed' ? 'Sudah dinilai' : 'Belum dikumpulkan'}
                </span>
                <span className='text-sm text-ink-muted'>{item.code}</span>
                <span className='text-sm font-medium text-primary'>
                  {item.submissionCount === 0 ? '—' : `${item.submissionCount} draft`}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);
