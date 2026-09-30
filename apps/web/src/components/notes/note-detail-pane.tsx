import { ExternalLink, Maximize2, X } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../../lib/formatting/formatters';
import { getSafeSourceUrl, getSourceName } from '../../lib/formatting/source';
import { CopyButton } from '../ui/copy-button';
import { detailContentClassName } from '../ui/detail-layout';
import { IconButton } from '../ui/icon-button';
import { NoteTags, NoteTypeLabel } from './note-badges';
import type { ReactNode } from 'react';
import type { Note } from '../../features/notes/notes-api';

type NoteDetailPaneProps = {
  actions?: ReactNode;
  mode?: 'page' | 'preview';
  note: Note;
  onClose?: () => void;
  onOpenPage?: () => void;
};

export const NoteDetailPane = ({ actions, mode = 'preview', note, onClose, onOpenPage }: NoteDetailPaneProps) => {
  const [raw, setRaw] = useState(false);
  const Heading = mode === 'page' ? 'h1' : 'h2';
  const origin = [note.sourceContext, note.sourceReference].filter((value): value is string => value !== null);
  const sourceUrl = getSafeSourceUrl(note.sourceUrl);
  const sourceName = getSourceName(note);
  const hasRaw = Boolean(note.rawText?.trim());
  const content = mode === 'page' && raw ? note.rawText : note.contentText;
  return (
    <aside
      className='min-w-0 w-full rounded-surface border border-border bg-surface'
      aria-label={`Detail ${note.title}`}
    >
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
            {note.title}
          </Heading>
          {mode === 'page' ? actions : null}
        </header>

        <div className='mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3'>
          <div className='flex min-w-0 max-w-full items-center gap-2'>
            {sourceUrl ? (
              <>
                <a
                  className='inline-flex min-w-0 items-center gap-2 text-sm font-medium text-primary hover:underline'
                  href={sourceUrl}
                  title={sourceUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <ExternalLink aria-hidden='true' size={16} className='shrink-0' />
                  <span className='truncate'>{sourceName ?? 'Buka sumber'}</span>
                  <span className='sr-only'> (tab baru)</span>
                </a>
                <CopyButton value={sourceUrl} label='Salin tautan' />
              </>
            ) : sourceName ? (
              <span className='text-sm text-ink-muted'>{sourceName}</span>
            ) : null}
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
          {content}
        </article>

        <section className='mt-8 border-t border-border pt-6' aria-label='Informasi Notes'>
          <dl className='space-y-2 text-sm'>
            <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
              <dt className='text-ink-muted'>Kode</dt>
              <dd className='flex min-w-0 flex-wrap items-center gap-2'>
                <span className='break-all text-sm text-ink-muted'>{note.code}</span>
                <CopyButton value={note.code} label='Salin kode' />
              </dd>
            </div>
            <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
              <dt className='text-ink-muted'>Tipe</dt>
              <dd>
                <NoteTypeLabel className='text-sm' type={note.type} />
              </dd>
            </div>
            <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
              <dt className='text-ink-muted'>Kategori</dt>
              <dd className='break-words'>{note.category}</dd>
            </div>
            <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
              <dt className='text-ink-muted'>Tanggal disimpan</dt>
              <dd>
                <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
              </dd>
            </div>
            {note.updatedAt !== note.createdAt ? (
              <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
                <dt className='text-ink-muted'>Tanggal diperbarui</dt>
                <dd>
                  <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
                </dd>
              </div>
            ) : null}
            {origin.length === 0 ? null : (
              <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-start gap-3'>
                <dt className='text-ink-muted'>Asal</dt>
                <dd className='break-words'>{origin.join(' · ')}</dd>
              </div>
            )}
            <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-start gap-3'>
              <dt className='text-ink-muted'>Tags</dt>
              <dd>{note.tags.length ? <NoteTags tags={note.tags} /> : '—'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </aside>
  );
};
