import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JunkAiCapture } from '../../../components/junk/junk-ai-capture';
import { JunkCaptureModeSwitch } from '../../../components/junk/junk-capture-mode';
import { JunkForm } from '../../../components/junk/junk-form';
import { createJunkItem, createJunkItemWithAi } from '../junk-api';
import { describeJunkAiError } from '../junk-display';
import type { JunkCaptureMode } from '../../../components/junk/junk-capture-mode';
import type { JunkFormValues } from '../../../components/junk/junk-form';

const JunkCreatePage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<JunkCaptureMode>('manual');
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
      setAiError(describeJunkAiError(error));
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
      <JunkCaptureModeSwitch mode={mode} onChange={setMode} />
      {mode === 'manual' ? (
        <JunkForm cancelTo='/junk' onSubmit={saveManual} submitLabel='Simpan Junk' />
      ) : (
        <JunkAiCapture error={aiError} onChangeText={setText} onSave={saveWithAi} saving={savingWithAi} text={text} />
      )}
    </div>
  );
};

export default JunkCreatePage;
