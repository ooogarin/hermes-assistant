import { Bookmark, FileText, Music2, Quote, Video, Wrench } from 'lucide-react';
import { classNames } from '../../lib/class-names';
import type { LucideIcon } from 'lucide-react';

const categoryStyles: Record<string, { icon: LucideIcon; text: string }> = {
  article: { icon: FileText, text: 'text-primary' },
  artikel: { icon: FileText, text: 'text-primary' },
  music: { icon: Music2, text: 'text-rose-600' },
  musik: { icon: Music2, text: 'text-rose-600' },
  quote: { icon: Quote, text: 'text-amber-600' },
  quotes: { icon: Quote, text: 'text-amber-600' },
  tool: { icon: Wrench, text: 'text-primary' },
  video: { icon: Video, text: 'text-violet-600' },
};

export const JunkCategoryLabel = ({ category }: { category: string }) => {
  const style = categoryStyles[category.toLowerCase()] ?? { icon: Bookmark, text: 'text-ink-muted' };
  const Icon = style.icon;

  return (
    <span className={classNames('inline-flex items-center gap-2 text-sm font-medium', style.text)}>
      <Icon aria-hidden='true' size={18} strokeWidth={1.9} />
      {category}
    </span>
  );
};

export const JunkTags = ({ tags }: { tags: string[] }) => {
  if (tags.length === 0) return null;

  return (
    <ul className='flex flex-wrap gap-1.5' aria-label='Tag Junk'>
      {tags.map((tag) => (
        <li key={tag} className='rounded-control border border-primary/25 px-2 py-0.5 text-xs font-medium text-primary'>
          {tag}
        </li>
      ))}
    </ul>
  );
};
