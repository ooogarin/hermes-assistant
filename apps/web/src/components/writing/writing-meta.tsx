import { ResponsiveTags } from '../ui/responsive-tags';
import type { WritingMaterial } from '../../features/writing/writing-api';

export const WritingMeta = ({ material }: { material: WritingMaterial }) => (
  <dl className='space-y-2 text-sm'>
    {[
      ['Genre', material.genre],
      ['Level', material.level],
      ['Target', `${material.targetWordCount} kata`],
      ['Sumber', material.source === 'cron' ? 'Daily practice' : 'Request'],
    ].map(([label, value]) => (
      <div key={label} className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-start gap-3'>
        <dt className='text-ink-muted'>{label}</dt>
        <dd className='min-w-0 break-words'>{value}</dd>
      </div>
    ))}
    <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-start gap-3'>
      <dt className='text-ink-muted'>Tags</dt>
      <dd className='min-w-0'>
        {material.tags.length ? <ResponsiveTags label='Tag prompt' tags={material.tags} /> : '—'}
      </dd>
    </div>
  </dl>
);
