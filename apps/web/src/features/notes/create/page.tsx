import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NoteForm } from '../../../components/notes/note-form';
import { AiCapture } from '../../../components/personal-content/ai-capture';
import { CaptureModeSwitch } from '../../../components/personal-content/capture-mode-switch';
import { describeAiCaptureError } from '../../../lib/api/ai-capture-error';
import { createNote, createNoteWithAi } from '../notes-api';
import type { NoteFormValues } from '../../../components/notes/note-form';
import type { CaptureMode } from '../../../components/personal-content/capture-mode-switch';

const NotesCreatePage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CaptureMode>('manual');
  const [text, setText] = useState('');
  const [savingWithAi, setSavingWithAi] = useState(false);
  const [aiError, setAiError] = useState<string>();

  const saveManual = async (values: NoteFormValues) => {
    const note = await createNote(values);
    navigate(`/notes/${note.code}`, { replace: true, state: { notice: 'Catatan berhasil dibuat.' } });
  };

  const saveWithAi = async () => {
    if (savingWithAi || text.trim().length === 0) return;

    setSavingWithAi(true);
    setAiError(undefined);

    try {
      const note = await createNoteWithAi(text);
      navigate(`/notes/${note.code}`, { replace: true, state: { notice: 'Catatan berhasil dibuat.' } });
    } catch (error) {
      setAiError(describeAiCaptureError(error, 'Catatan'));
      setSavingWithAi(false);
    }
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to='/notes'>
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke Notes
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Buat catatan</h1>
      </header>
      <CaptureModeSwitch ariaLabel='Jalur input Notes' mode={mode} onChange={setMode} />
      {mode === 'manual' ? (
        <NoteForm cancelTo='/notes' onSubmit={saveManual} submitLabel='Simpan catatan' />
      ) : (
        <AiCapture
          description='Tulis catatan bebas. AI akan menyusun field Notes lalu langsung menyimpannya. Koreksi bisa dilakukan di halaman detail setelah catatan tersimpan.'
          error={aiError}
          helper='Contoh: postgres advisory lock otomatis lepas saat transaksi selesai https://example.com/lock'
          label='Pesan'
          onChangeText={setText}
          onSave={saveWithAi}
          saving={savingWithAi}
          text={text}
        />
      )}
    </div>
  );
};

export default NotesCreatePage;
