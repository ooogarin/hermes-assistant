import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/formatting/formatters';
import { TagList } from '../ui/chip';
import type { ReadingMaterialListItem } from '../../features/reading/reading-api';

export const ReadingStatusLabel = ({ status }: { status: 'read' | 'unread' }) => (
  <span
    className={
      status === 'read'
        ? 'inline-flex shrink-0 rounded-full border border-primary/25 bg-primary-subtle px-2 py-1 text-xs font-medium text-primary'
        : 'inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700'
    }
  >
    {status === 'read' ? 'Sudah dibaca' : 'Belum dibaca'}
  </span>
);

export const ReadingList = ({ items }: { items: ReadingMaterialListItem[] }) => (
  <section aria-label='Bacaan' className='overflow-x-auto rounded-surface border border-border bg-surface'>
    <table className='w-full min-w-200 text-left text-sm'>
      <thead className='border-b border-border text-xs font-medium text-ink-muted'>
        <tr>
          {['Judul / Cuplikan', 'Genre', 'Level', 'Tags', 'Tanggal disimpan'].map((label) => (
            <th key={label} className='px-5 py-4 font-medium'>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.code} className='border-b border-border last:border-b-0 hover:bg-surface-subtle'>
            <td className='w-[45%] px-5 py-5 align-top'>
              <Link
                className='block rounded-control focus-visible:outline-2 focus-visible:outline-primary'
                to={`/english/reading/${item.code}`}
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='font-semibold text-ink hover:text-primary'>{item.title}</span>
                  <ReadingStatusLabel status={item.readingStatus} />
                </div>
                <p className='mt-2 line-clamp-3 max-w-xl leading-6 text-ink-muted'>{item.contentExcerpt}</p>
              </Link>
            </td>
            <td className='max-w-40 px-5 py-5 align-top text-ink-muted'>{item.genre}</td>
            <td className='px-5 py-5 align-top text-ink-muted'>{item.level}</td>
            <td className='px-5 py-5 align-top'>
              <TagList tags={item.tags} maxVisible={2} label={`Tag ${item.title}`} />
            </td>
            <td className='whitespace-nowrap px-5 py-5 align-top text-ink-muted'>{formatDate(item.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
