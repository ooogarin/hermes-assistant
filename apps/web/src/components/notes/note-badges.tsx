import { classNames } from '../../lib/class-names';
import type { Note } from '../../features/notes/notes-api';

const noteTypeLabels: Record<Note['type'], string> = {
  fact: 'Fact',
  idea: 'Idea',
  news: 'News',
  personal: 'Personal',
  quote: 'Quote',
  reminder: 'Reminder',
};

export const NoteTypeLabel = ({ className, type }: { className?: string; type: Note['type'] }) => (
  <span className={classNames('font-semibold text-primary', className ?? 'text-xs')}>{noteTypeLabels[type]}</span>
);

export const NoteTags = ({ tags }: { tags: string[] }) => {
  if (tags.length === 0) return null;

  return (
    <ul className='flex flex-wrap gap-2' aria-label='Tag catatan'>
      {tags.map((tag) => (
        <li key={tag} className='rounded-control border border-primary/25 px-2 py-1 text-xs font-medium text-primary'>
          {tag}
        </li>
      ))}
    </ul>
  );
};
