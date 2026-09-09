import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NoteForm } from '../../../components/notes/note-form';
import { createNote } from '../notes-api';
import type { NoteFormValues } from '../../../components/notes/note-form';

const NotesCreatePage = () => {
  const navigate = useNavigate();
  const save = async (values: NoteFormValues) => {
    const note = await createNote(values);
    navigate(`/notes/${note.code}`, { replace: true, state: { notice: 'Catatan berhasil dibuat.' } });
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to='/notes'>
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke Notes
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Buat catatan</h1>
        <p className='mt-3 max-w-2xl text-base leading-7 text-ink-muted'>
          Simpan informasi yang ingin ditemukan kembali dalam jangka panjang.
        </p>
      </header>
      <NoteForm cancelTo='/notes' onSubmit={save} submitLabel='Simpan catatan' />
    </div>
  );
};

export default NotesCreatePage;
