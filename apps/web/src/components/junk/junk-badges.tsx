import { ResponsiveTags } from '../ui/responsive-tags';

const categoryStyles: Record<string, string> = {
  article: 'text-primary',
  artikel: 'text-primary',
  music: 'text-rose-700',
  musik: 'text-rose-700',
  quote: 'text-amber-700',
  quotes: 'text-amber-700',
  tool: 'text-primary',
  video: 'text-violet-700',
};

export const JunkCategoryLabel = ({ category }: { category: string }) => (
  <span
    className={`break-words text-sm font-medium ${categoryStyles[category.trim().toLowerCase()] ?? 'text-ink-muted'}`}
  >
    {category}
  </span>
);

export const JunkTags = ({ tags, maxRows }: { tags: string[]; maxRows?: number }) => (
  <ResponsiveTags label='Tag Junk' maxRows={maxRows} tags={tags} />
);
