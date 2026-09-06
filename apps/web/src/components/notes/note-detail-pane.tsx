import { Maximize2, X } from 'lucide-react';
import { formatDate } from '../../lib/formatting/formatters';
import { IconButton } from '../ui/icon-button';
import { NoteTags, NoteTypeLabel } from './note-badges';
import type { ReactNode } from 'react';
import type { Note } from '../../features/notes/notes-api';

type NoteDetailPaneProps = {
  mode?: 'page' | 'preview';
  note: Note;
  onClose?: () => void;
  onOpenPage?: () => void;
};

const DetailSection = ({ children, title }: { children: ReactNode; title: string }) => (
  <section className='border-t border-border pt-6'>
    <h3 className='text-sm font-medium text-ink-muted'>{title}</h3>
    <div className='mt-3 text-sm leading-7 text-ink'>{children}</div>
  </section>
);

export const NoteDetailPane = ({ mode = 'preview', note, onClose, onOpenPage }: NoteDetailPaneProps) => (
  <aside
    className='min-h-full w-full rounded-surface border border-border bg-surface p-6 sm:p-8'
    aria-label={`Detail ${note.title}`}
  >
    <div className='flex items-start gap-4'>
      <div className='min-w-0 flex-1'>
        <h2 className='text-2xl font-semibold tracking-tight text-ink sm:text-3xl'>{note.title}</h2>
        <p className='mt-3 text-sm text-ink-muted'>
          <NoteTypeLabel className='text-sm' type={note.type} /> · {note.category} · {formatDate(note.createdAt)} ·{' '}
          {note.code}
        </p>
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
      ) : null}
    </div>

    <article className='mt-7 whitespace-pre-wrap text-base leading-8 text-ink'>{note.content}</article>

    <div className='mt-8 space-y-6'>
      <DetailSection title='Tag'>
        <NoteTags tags={note.tags} />
      </DetailSection>
      {note.source !== null ? <DetailSection title='Sumber'>{note.source}</DetailSection> : null}
      {note.sourceContext !== null || note.sourceReference !== null ? (
        <DetailSection title='Asal'>
          {[note.sourceContext, note.sourceReference].filter((value): value is string => value !== null).join(' · ')}
        </DetailSection>
      ) : null}
    </div>
  </aside>
);
