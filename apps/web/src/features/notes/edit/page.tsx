import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { NoteForm } from '../../../components/notes/note-form';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getNote, updateNote } from '../notes-api';
import type { NoteFormValues } from '../../../components/notes/note-form';
import type { Note, UpdateNoteInput } from '../notes-api';

const toFormValues = (note: Note): NoteFormValues => ({
  category: note.category,
  contentText: note.contentText,
  sourceName: note.sourceName,
  sourceUrl: note.sourceUrl,
  tags: note.tags,
  title: note.title,
  type: note.type,
});

const NotesEditPage = () => {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const note = useApiQuery(`edit:${code}`, (signal) => getNote(code, signal));

  const save = async (values: NoteFormValues, current: Note) => {
    const input: UpdateNoteInput = {};
    if (values.title !== current.title) input.title = values.title;
    if (values.contentText !== current.contentText) input.contentText = values.contentText;
    if (values.type !== current.type) input.type = values.type;
    if (values.category !== current.category) input.category = values.category;
    if (values.sourceName !== current.sourceName) input.sourceName = values.sourceName;
    if (values.sourceUrl !== current.sourceUrl) input.sourceUrl = values.sourceUrl;
    if (values.tags.join() !== current.tags.join()) input.tags = values.tags;
    await updateNote(code, input);
    navigate(`/notes/${code}`, { replace: true, state: { notice: 'Catatan berhasil diperbarui.' } });
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/notes/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke detail
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Edit catatan</h1>
      </header>
      {note.status === 'loading' ? (
        <div className='mt-7'>
          <CollectionSkeleton rows={5} />
        </div>
      ) : null}
      {note.status === 'error' ? (
        <div className='mt-7'>
          <QueryError
            error={note.error}
            notFound={{
              title: 'Catatan tidak ditemukan',
              description: 'Catatan ini mungkin sudah tidak tersedia.',
            }}
            onRetry={note.retry}
          />
        </div>
      ) : null}
      {note.status === 'success' ? (
        <NoteForm
          cancelTo={`/notes/${code}`}
          initial={toFormValues(note.data)}
          onSubmit={(values) => save(values, note.data)}
          submitLabel='Simpan perubahan'
        />
      ) : null}
    </div>
  );
};

export default NotesEditPage;
