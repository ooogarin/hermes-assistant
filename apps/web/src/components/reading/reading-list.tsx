import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { LearningListCell } from '../english/learning-list-cell';
import { TagList } from '../ui/chip';
import type { ReadingMaterialListItem } from '../../features/reading/reading-api';

const readingColumns =
  'xl:grid-cols-[minmax(10rem,2fr)_minmax(4rem,0.6fr)_2.5rem_4.25rem_minmax(5.5rem,0.8fr)_5rem_5rem_6.5rem_8.5rem]';

const Status = ({ status }: { status: ReadingMaterialListItem['status'] }) => (
  <span
    className={
      status === 'completed'
        ? 'inline-flex whitespace-nowrap rounded-control border border-primary/40 bg-primary-subtle px-2 py-1 text-xs font-medium text-primary'
        : 'inline-flex whitespace-nowrap rounded-control border border-amber-400 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700'
    }
  >
    {status === 'completed' ? 'Selesai' : 'Belum dijawab'}
  </span>
);

export const ReadingList = ({ items }: { items: ReadingMaterialListItem[] }) => (
  <section
    className='overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='reading-materials'
  >
    <h2 id='reading-materials' className='sr-only'>
      Materi Reading
    </h2>
    <div
      className={`hidden gap-1.5 border-b border-border px-5 py-3 text-xs font-medium text-ink-muted xl:grid ${readingColumns}`}
    >
      <span>Judul</span>
      <span>Genre</span>
      <span>Level</span>
      <span>Detail</span>
      <span>Tags</span>
      <span>Dibuat</span>
      <span>Sumber</span>
      <span>Status</span>
      <span>Kode</span>
    </div>
    <ul>
      {items.map((item) => (
        <li key={item.code} className='border-b border-border last:border-b-0'>
          <Link
            className='block px-5 py-5 transition-colors hover:bg-surface-subtle'
            to={`/english/reading/${item.code}`}
          >
            <div
              className={`grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 xl:items-start xl:gap-1.5 ${readingColumns}`}
            >
              <div className='col-span-full flex min-w-0 items-start gap-3 xl:col-span-1'>
                <span className='inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border text-ink-muted'>
                  <BookOpen aria-hidden='true' size={19} />
                </span>
                <span className='min-w-0 truncate font-semibold text-ink'>{item.title}</span>
              </div>
              <LearningListCell hideLabelAt='xl' label='Genre'>
                <span className='block truncate text-sm text-ink-muted'>{item.genre}</span>
              </LearningListCell>
              <LearningListCell hideLabelAt='xl' label='Level'>
                <span className='text-sm text-ink-muted'>{item.level}</span>
              </LearningListCell>
              <LearningListCell hideLabelAt='xl' label='Detail'>
                <span className='whitespace-nowrap text-sm text-ink-muted'>{item.wordCount} kata</span>
              </LearningListCell>
              <LearningListCell className='col-span-2 self-start sm:col-span-1' hideLabelAt='xl' label='Tags'>
                <TagList
                  className='self-start'
                  label={`Tag ${item.title}`}
                  maxVisible={1}
                  tags={item.tags}
                  wrap={false}
                />
              </LearningListCell>
              <LearningListCell hideLabelAt='xl' label='Dibuat'>
                <span className='whitespace-nowrap text-sm text-ink-muted'>{formatDate(item.createdAt)}</span>
              </LearningListCell>
              <LearningListCell hideLabelAt='xl' label='Sumber'>
                <span className='block truncate text-sm text-ink-muted'>
                  {item.source === 'cron' ? 'Daily practice' : 'Request'}
                </span>
              </LearningListCell>
              <LearningListCell className='self-start' hideLabelAt='xl' label='Status'>
                <Status status={item.status} />
              </LearningListCell>
              <LearningListCell hideLabelAt='xl' label='Kode'>
                <span className='whitespace-nowrap text-sm text-ink-muted'>{item.code}</span>
              </LearningListCell>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
