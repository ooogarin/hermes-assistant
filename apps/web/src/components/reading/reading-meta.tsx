import { classNames } from '../../lib/class-names';
import type { ReadingMaterial } from '../../features/reading/reading-api';

export const ReadingMeta = ({ material, className }: { material: ReadingMaterial; className?: string }) => (
  <dl className={classNames('flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-muted', className)}>
    <div>
      <dt className='sr-only'>Kode</dt>
      <dd className='font-medium text-ink'>{material.code}</dd>
    </div>
    <div>
      <dt className='sr-only'>Judul</dt>
      <dd>{material.title}</dd>
    </div>
    <div>
      <dt className='sr-only'>Genre</dt>
      <dd>Genre: {material.genre}</dd>
    </div>
    <div>
      <dt className='sr-only'>Level</dt>
      <dd>Level: {material.level}</dd>
    </div>
    <div>
      <dt className='sr-only'>Jumlah kata</dt>
      <dd>{material.wordCount} kata</dd>
    </div>
    <div>
      <dt className='sr-only'>Sumber</dt>
      <dd>{material.source === 'cron' ? 'Daily practice' : 'Request'}</dd>
    </div>
    {material.tags.map((tag) => (
      <div key={tag}>
        <dt className='sr-only'>Tag</dt>
        <dd className='font-medium text-primary'>#{tag}</dd>
      </div>
    ))}
  </dl>
);
