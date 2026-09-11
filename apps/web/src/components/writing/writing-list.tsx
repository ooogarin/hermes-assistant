import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { LearningListCell } from '../english/learning-list-cell';
import { TagList } from '../ui/chip';
import type { WritingMaterialListItem } from '../../features/writing/writing-api';

const writingColumns = 'lg:grid-cols-[minmax(11.5rem,2fr)_minmax(4rem,0.65fr)_2.75rem_5rem_4.25rem_minmax(6rem,1fr)]';

export const WritingList = ({ items }: { items: WritingMaterialListItem[] }) => (
  <section
    className='overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='writing-materials'
  >
    <h2 id='writing-materials' className='sr-only'>
      Materi Writing
    </h2>
    <div
      className={`hidden gap-2 border-b border-border px-5 py-3 text-xs font-medium text-ink-muted lg:grid ${writingColumns}`}
    >
      <span>Topik</span>
      <span>Genre</span>
      <span>Level</span>
      <span>Dibuat</span>
      <span>Detail</span>
      <span>Tags</span>
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
              <div
                className={`grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:items-start lg:gap-2 ${writingColumns}`}
              >
                <div className='col-span-full min-w-0 lg:col-span-1'>
                  <h3 className='truncate font-semibold text-ink'>{item.topic}</h3>
                </div>
                <LearningListCell label='Genre'>
                  <span className='block truncate text-sm text-ink-muted'>{item.genre}</span>
                </LearningListCell>
                <LearningListCell label='Level'>
                  <span className='text-sm text-ink-muted'>{item.level}</span>
                </LearningListCell>
                <LearningListCell label='Dibuat'>
                  <span className='whitespace-nowrap text-sm text-ink-muted'>{formatDate(item.createdAt)}</span>
                </LearningListCell>
                <LearningListCell label='Detail'>
                  <span className='whitespace-nowrap text-sm text-ink-muted'>{item.targetWordCount} kata</span>
                </LearningListCell>
                <LearningListCell className='col-span-2 self-start sm:col-span-1' label='Tags'>
                  <TagList
                    className='self-start'
                    label={`Tag ${item.topic}`}
                    maxVisible={2}
                    tags={item.tags}
                    wrap={false}
                  />
                </LearningListCell>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);
