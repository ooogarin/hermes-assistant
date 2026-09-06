import { BookOpen, CalendarDays, ChartNoAxesColumnIncreasing, PenLine, Tag } from 'lucide-react';
import type { WritingMaterial } from '../../features/writing/writing-api';

export const WritingMeta = ({ material }: { material: WritingMaterial }) => (
  <dl className='flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-muted'>
    <div className='flex items-center gap-2'>
      <BookOpen aria-hidden='true' size={18} />
      <dt className='sr-only'>Genre</dt>
      <dd>{material.genre}</dd>
    </div>
    <div className='flex items-center gap-2'>
      <ChartNoAxesColumnIncreasing aria-hidden='true' size={18} />
      <dt className='sr-only'>Level</dt>
      <dd>Level {material.level}</dd>
    </div>
    <div className='flex items-center gap-2'>
      <PenLine aria-hidden='true' size={18} />
      <dt className='sr-only'>Target</dt>
      <dd>Target {material.targetWordCount} kata</dd>
    </div>
    <div className='flex items-center gap-2'>
      <CalendarDays aria-hidden='true' size={18} />
      <dt className='sr-only'>Sumber</dt>
      <dd>{material.source === 'cron' ? 'Daily practice' : 'Request'}</dd>
    </div>
    {material.tags.map((tag) => (
      <div key={tag} className='flex items-center gap-2 text-primary'>
        <Tag aria-hidden='true' size={17} />
        <dt className='sr-only'>Tag</dt>
        <dd>#{tag}</dd>
      </div>
    ))}
  </dl>
);
