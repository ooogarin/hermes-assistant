import { ExternalLink, Maximize2, X } from 'lucide-react';
import { getJunkTitle, getSourceHost } from '../../features/junk/junk-display';
import { formatDate } from '../../lib/formatting/formatters';
import { IconButton } from '../ui/icon-button';
import { JunkCategoryLabel, JunkTags } from './junk-badges';
import type { ReactNode } from 'react';
import type { JunkItem } from '../../features/junk/junk-api';

const DetailSection = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className='border-t border-border pt-6'>
    <h3 className='text-sm font-medium text-ink-muted'>{title}</h3>
    <div className='mt-3 text-sm leading-7 text-ink'>{children}</div>
  </section>
);

export const JunkDetailPane = ({
  actions,
  item,
  mode = 'preview',
  onClose,
  onOpenPage,
}: {
  actions?: ReactNode;
  item: JunkItem;
  mode?: 'page' | 'preview';
  onClose?: () => void;
  onOpenPage?: () => void;
}) => {
  const sourceHost = getSourceHost(item.sourceUrl);

  return (
    <aside
      className='min-h-full w-full rounded-surface border border-border bg-surface p-6 sm:p-8'
      aria-label={`Detail ${getJunkTitle(item)}`}
    >
      <div className='flex items-start gap-4'>
        <div className='min-w-0 flex-1'>
          <JunkCategoryLabel category={item.category} />
          <h2 className='mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>{getJunkTitle(item)}</h2>
          {item.sourceUrl === null ? null : (
            <a
              className='mt-3 inline-flex items-start gap-2 break-all text-sm font-medium text-primary hover:underline'
              href={item.sourceUrl}
              rel='noreferrer'
              target='_blank'
            >
              <ExternalLink aria-hidden='true' className='mt-0.5 shrink-0' size={16} />
              {item.sourceUrl}
            </a>
          )}
        </div>
        {mode === 'preview' ? (
          <div className='flex shrink-0 gap-2'>
            <IconButton label='Buka halaman detail' onClick={onOpenPage}>
              <Maximize2 aria-hidden='true' size={19} />
            </IconButton>
            <IconButton label='Tutup preview' onClick={onClose}>
              <X aria-hidden='true' size={19} />
            </IconButton>
          </div>
        ) : actions === undefined ? null : (
          <div className='flex shrink-0 flex-wrap gap-2'>{actions}</div>
        )}
      </div>

      {item.contentText === null ? null : (
        <article className='mt-7 whitespace-pre-wrap text-base leading-8 text-ink'>{item.contentText}</article>
      )}

      <div className='mt-8 space-y-6'>
        <DetailSection title='Kategori'>
          <JunkCategoryLabel category={item.category} />
        </DetailSection>
        {item.tags.length === 0 ? null : (
          <DetailSection title='Tags'>
            <JunkTags tags={item.tags} />
          </DetailSection>
        )}
        <DetailSection title='Metadata'>
          <dl className='grid gap-3'>
            {sourceHost === null ? null : (
              <div className='flex justify-between gap-4'>
                <dt className='text-ink-muted'>Sumber</dt>
                <dd>{sourceHost}</dd>
              </div>
            )}
            <div className='flex justify-between gap-4'>
              <dt className='text-ink-muted'>Tanggal disimpan</dt>
              <dd>{formatDate(item.createdAt)}</dd>
            </div>
            <div className='flex justify-between gap-4'>
              <dt className='text-ink-muted'>Kode</dt>
              <dd>{item.code}</dd>
            </div>
          </dl>
        </DetailSection>
      </div>
    </aside>
  );
};
