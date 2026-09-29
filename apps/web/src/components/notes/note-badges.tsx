import { classNames } from '../../lib/class-names';
import { ResponsiveTags } from '../ui/responsive-tags';
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

export const NoteTags = ({ tags, maxRows }: { tags: string[]; maxRows?: number }) => (
  <ResponsiveTags label='Tag catatan' maxRows={maxRows} tags={tags} />
);
