import { getJunkTitle } from '../../features/junk/junk-display';
import { formatDate } from '../../lib/formatting/formatters';
import { CopyButton } from '../ui/copy-button';
import { DetailPane, DetailRow } from '../ui/detail-pane';
import { JunkCategoryLabel, JunkTags } from './junk-badges';
import type { ReactNode } from 'react';
import type { JunkItem } from '../../features/junk/junk-api';

type JunkDetailPaneProps = {
  actions?: ReactNode;
  item: JunkItem;
  mode?: 'page' | 'preview';
  onClose?: () => void;
  onOpenPage?: () => void;
};

export const JunkDetailPane = ({ actions, item, mode = 'preview', onClose, onOpenPage }: JunkDetailPaneProps) => {
  const title = getJunkTitle(item);

  const metadata = (
    <>
      <DetailRow className='flex min-w-0 flex-wrap items-center gap-2' label='Kode'>
        <span className='break-all text-sm text-ink-muted'>{item.code}</span>
        <CopyButton value={item.code} label='Salin kode' />
      </DetailRow>
      <DetailRow label='Kategori'>
        <JunkCategoryLabel category={item.category} />
      </DetailRow>
      <DetailRow label='Tanggal disimpan'>
        <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
      </DetailRow>
      {item.updatedAt !== item.createdAt ? (
        <DetailRow label='Tanggal diperbarui'>
          <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time>
        </DetailRow>
      ) : null}
      <DetailRow align='start' label='Tags'>
        {item.tags.length ? <JunkTags tags={item.tags} /> : '—'}
      </DetailRow>
    </>
  );

  return (
    <DetailPane
      actions={actions}
      content={item.contentText ?? ''}
      emptyContent='Belum ada konten.'
      infoLabel='Informasi Junk'
      label={`Detail ${title}`}
      metadata={metadata}
      mode={mode}
      onClose={onClose}
      onOpenPage={onOpenPage}
      rawText={item.rawText}
      sourceFallback='Tanpa sumber'
      sourceName={item.sourceName}
      sourceUrl={item.sourceUrl}
      title={title}
    />
  );
};
