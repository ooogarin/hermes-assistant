import { classNames } from '../../lib/class-names';
import { TagList } from '../ui/chip';
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

export const NoteTags = ({ tags }: { tags: string[] }) => <TagList label='Tag catatan' tags={tags} />;
