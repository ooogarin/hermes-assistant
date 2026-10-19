import { formatDate } from '../../lib/formatting/formatters';
import { CopyButton } from '../ui/copy-button';
import { DetailPane, DetailRow } from '../ui/detail-pane';
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
  const origin = [note.sourceContext, note.sourceReference].filter((value): value is string => value !== null);

  const metadata = (
    <>
      <DetailRow className='flex min-w-0 flex-wrap items-center gap-2' label='Kode'>
        <span className='break-all text-sm text-ink-muted'>{note.code}</span>
        <CopyButton value={note.code} label='Salin kode' />
      </DetailRow>
      <DetailRow label='Tipe'>
        <NoteTypeLabel className='text-sm' type={note.type} />
      </DetailRow>
      <DetailRow className='break-words' label='Kategori'>
        {note.category}
      </DetailRow>
      <DetailRow label='Tanggal disimpan'>
        <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
      </DetailRow>
      {note.updatedAt !== note.createdAt ? (
        <DetailRow label='Tanggal diperbarui'>
          <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
        </DetailRow>
      ) : null}
      {origin.length === 0 ? null : (
        <DetailRow align='start' className='break-words' label='Asal'>
          {origin.join(' · ')}
        </DetailRow>
      )}
      <DetailRow align='start' label='Tags'>
        {note.tags.length ? <NoteTags tags={note.tags} /> : '—'}
      </DetailRow>
    </>
  );

  return (
    <DetailPane
      actions={actions}
      content={note.contentText}
      infoLabel='Informasi Notes'
      label={`Detail ${note.title}`}
      metadata={metadata}
      mode={mode}
      onClose={onClose}
      onOpenPage={onOpenPage}
      rawText={note.rawText}
      sourceName={note.sourceName}
      sourceUrl={note.sourceUrl}
      title={note.title}
    />
  );
};
