import { ExternalLink, Maximize2, X } from 'lucide-react';
import { useState } from 'react';
import { getSafeSourceUrl, getSourceName } from '../../lib/formatting/source';
import { CopyButton } from './copy-button';
import { detailContentClassName } from './detail-layout';
import { IconButton } from './icon-button';
import type { ReactNode } from 'react';

type DetailRowProps = {
  align?: 'center' | 'start';
  children: ReactNode;
  className?: string;
  label: string;
};

export const DetailRow = ({ align = 'center', children, className, label }: DetailRowProps) => (
  <div
    className={`grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] ${align === 'start' ? 'items-start' : 'items-center'} gap-3`}
  >
    <dt className='text-ink-muted'>{label}</dt>
    <dd className={className}>{children}</dd>
  </div>
);

type DetailPaneProps = {
  actions?: ReactNode;
  /** Content of the record. */
  content: string;
  /** Shown when the record has no content. */
  emptyContent?: string;
  /** Accessible name of the metadata section. */
  infoLabel: string;
  /** Accessible name of the pane. */
  label: string;
  /** Rows of the metadata list. */
  metadata: ReactNode;
  mode?: 'page' | 'preview';
  onClose?: () => void;
  onOpenPage?: () => void;
  /** Original text of the record, shown when the reader switches to it. */
  rawText?: string | null;
  /** Shown when the record has no source name and no source link. */
  sourceFallback?: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  title: string;
};

/**
 * Shows one stored record with its source and its metadata. The feature keeps
 * the metadata rows, the primitive keeps the layout and the interactions.
 */
export const DetailPane = ({
  actions,
  content,
  emptyContent,
  infoLabel,
  label,
  metadata,
  mode = 'preview',
  onClose,
  onOpenPage,
  rawText,
  sourceFallback,
  sourceName,
  sourceUrl,
  title,
}: DetailPaneProps) => {
  const [raw, setRaw] = useState(false);
  const Heading = mode === 'page' ? 'h1' : 'h2';
  const safeSourceUrl = getSafeSourceUrl(sourceUrl ?? null);
  const safeSourceName = getSourceName({ sourceName: sourceName ?? null, sourceUrl: sourceUrl ?? null });
  const hasRaw = Boolean(rawText?.trim());
  const shownContent = mode === 'page' && raw ? (rawText ?? '') : content;
  const isEmpty = shownContent.trim().length === 0;

  return (
    <aside className='min-w-0 w-full rounded-surface border border-border bg-surface' aria-label={label}>
      {mode === 'preview' ? (
        <div className='flex items-center justify-between gap-4 border-b border-border px-5 py-3'>
          <span className='text-sm font-semibold text-ink'>Detail</span>
          <div className='flex shrink-0 items-center gap-2'>
            {actions}
            <IconButton label='Buka halaman detail' title='Perbesar' onClick={onOpenPage}>
              <Maximize2 aria-hidden='true' size={19} />
            </IconButton>
            <IconButton label='Tutup preview' title='Tutup' onClick={onClose}>
              <X aria-hidden='true' size={19} />
            </IconButton>
          </div>
        </div>
      ) : null}
      <div className={detailContentClassName[mode]}>
        <header className='flex flex-wrap items-start justify-between gap-x-6 gap-y-4'>
          <Heading className='min-w-0 flex-1 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>
            {title}
          </Heading>
          {mode === 'page' ? actions : null}
        </header>

        <div className='mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
          <div className='flex min-w-0 max-w-full items-center gap-2'>
            {safeSourceUrl ? (
              <>
                <a
                  className='inline-flex min-w-0 items-center gap-2 text-sm font-medium text-primary hover:underline'
                  href={safeSourceUrl}
                  title={safeSourceUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <ExternalLink aria-hidden='true' size={16} className='shrink-0' />
                  <span className='truncate'>{safeSourceName ?? 'Buka sumber'}</span>
                  <span className='sr-only'> (tab baru)</span>
                </a>
                <CopyButton key={safeSourceUrl} value={safeSourceUrl} label='Salin tautan' />
              </>
            ) : safeSourceName ? (
              <span className='text-sm text-ink-muted'>{safeSourceName}</span>
            ) : sourceFallback === undefined ? null : (
              <span className='text-sm text-ink-muted'>{sourceFallback}</span>
            )}
          </div>
          {mode === 'page' ? (
            <label
              className={`inline-flex items-center gap-2 text-sm ${hasRaw ? 'cursor-pointer text-ink-muted' : 'text-ink-muted/70'}`}
              title={hasRaw ? 'Ganti antara konten dan teks asli' : 'Teks asli tidak tersedia'}
            >
              <input
                className='peer sr-only'
                type='checkbox'
                role='switch'
                aria-checked={raw}
                checked={raw}
                disabled={!hasRaw}
                onChange={(event) => setRaw(event.target.checked)}
              />
              <span
                aria-hidden='true'
                className='relative h-5 w-9 rounded-full bg-ink-muted/30 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2'
              />
              Teks asli{hasRaw ? null : <span className='sr-only'> tidak tersedia</span>}
            </label>
          ) : null}
        </div>

        <article
          aria-label={mode === 'page' && raw ? 'Teks asli' : 'Konten'}
          className='mt-7 whitespace-pre-wrap break-words text-base leading-8 text-ink'
        >
          {isEmpty && emptyContent !== undefined ? (
            <p className='text-sm text-ink-muted'>{emptyContent}</p>
          ) : (
            shownContent
          )}
        </article>

        <section className='mt-8 border-t border-border pt-6' aria-label={infoLabel}>
          <dl className='space-y-2 text-sm'>{metadata}</dl>
        </section>
      </div>
    </aside>
  );
};
