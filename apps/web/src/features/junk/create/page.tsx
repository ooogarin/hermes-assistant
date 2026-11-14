import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JunkForm } from '../../../components/junk/junk-form';
import { AiCapture } from '../../../components/personal-content/ai-capture';
import { CaptureModeSwitch } from '../../../components/personal-content/capture-mode-switch';
import { describeAiCaptureError } from '../../../lib/api/ai-capture-error';
import { createJunkItem, createJunkItemWithAi } from '../junk-api';
import type { JunkFormValues } from '../../../components/junk/junk-form';
import type { CaptureMode } from '../../../components/personal-content/capture-mode-switch';

const JunkCreatePage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CaptureMode>('manual');
  const [text, setText] = useState('');
  const [savingWithAi, setSavingWithAi] = useState(false);
  const [aiError, setAiError] = useState<string>();

  const saveManual = async (values: JunkFormValues) => {
    const item = await createJunkItem(values);
    navigate(`/junk/${item.code}`, { replace: true, state: { notice: 'Junk berhasil dibuat.' } });
  };

  const saveWithAi = async () => {
    if (savingWithAi || text.trim().length === 0) return;

    setSavingWithAi(true);
    setAiError(undefined);

    try {
      const item = await createJunkItemWithAi(text);
      navigate(`/junk/${item.code}`, { replace: true, state: { notice: 'Junk berhasil dibuat.' } });
    } catch (error) {
      setAiError(describeAiCaptureError(error, 'Junk'));
      setSavingWithAi(false);
    }
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline' to='/junk'>
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke Junk
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Tambah Junk</h1>
      </header>
      <CaptureModeSwitch ariaLabel='Jalur input Junk' mode={mode} onChange={setMode} />
      {mode === 'manual' ? (
        <JunkForm cancelTo='/junk' onSubmit={saveManual} submitLabel='Simpan Junk' />
      ) : (
        <AiCapture
          description='Tulis pesan bebas. AI akan menyusun field Junk lalu langsung menyimpannya. Koreksi bisa dilakukan di halaman detail setelah item tersimpan.'
          error={aiError}
          helper='Contoh: artikel bagus soal rust https://blog.example.com/rust'
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

export default JunkCreatePage;
