import { ArrowLeft, CircleGauge, ListChecks, Repeat2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLevelPicker, SettingsNumberField, SettingsSummary } from '../../../components/english/settings-parts';
import { ErrorState } from '../../../components/feedback/content-state';
import { Skeleton } from '../../../components/feedback/skeleton';
import { Button } from '../../../components/ui/button';
import { classNames } from '../../../lib/class-names';
import { formatDate } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useUnsavedChanges } from '../../../lib/hooks/use-unsaved-changes';
import { getGrammarSettings, updateGrammarSettings } from '../grammar-api';
import type { FormEvent } from 'react';
import type { GrammarSettings, GrammarSettingsInput } from '../grammar-api';

const LoadingState = () => (
  <div className='grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]'>
    <div className='space-y-8'>
      <Skeleton className='h-8 w-52' />
      <Skeleton className='h-20 w-full' />
      <Skeleton className='h-px w-full' />
      <Skeleton className='h-8 w-48' />
      <Skeleton className='h-16 w-full' />
    </div>
    <div className='space-y-5 border-l border-border pl-8'>
      <Skeleton className='h-8 w-44' />
      <Skeleton className='h-16 w-full' />
      <Skeleton className='h-16 w-full' />
      <Skeleton className='h-16 w-full' />
    </div>
  </div>
);

const Summary = ({ settings }: { settings: GrammarSettings }) => {
  const rows = [
    { icon: CircleGauge, label: 'Level default', value: settings.defaultLevel },
    { icon: ListChecks, label: 'Soal harian', value: `${settings.dailyQuestionCount} soal` },
    { icon: Repeat2, label: 'Mode daily practice', value: 'Practice' },
  ];

  return (
    <SettingsSummary
      note='Latihan on-request dan exam dapat memakai level, area, point, tipe, atau jumlah soal berbeda tanpa mengubah pengaturan default ini.'
      rows={rows}
    />
  );
};

const SettingsForm = ({ initial }: { initial: GrammarSettings }) => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial);
  const [defaultLevel, setDefaultLevel] = useState(initial.defaultLevel);
  const [dailyQuestionCount, setDailyQuestionCount] = useState(initial.dailyQuestionCount);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const dirty = defaultLevel !== saved.defaultLevel || dailyQuestionCount !== saved.dailyQuestionCount;
  const valid = Number.isInteger(dailyQuestionCount) && dailyQuestionCount >= 1 && dailyQuestionCount <= 100;

  const canLeave = useUnsavedChanges(dirty);

  const leave = () => {
    if (canLeave()) navigate('/english/grammar');
  };

  const changes = useMemo(() => {
    const input: GrammarSettingsInput = {};
    if (defaultLevel !== saved.defaultLevel) input.defaultLevel = defaultLevel;
    if (dailyQuestionCount !== saved.dailyQuestionCount) input.dailyQuestionCount = dailyQuestionCount;
    return input;
  }, [dailyQuestionCount, defaultLevel, saved]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    setMessage(undefined);
    try {
      const updated = await updateGrammarSettings(changes);
      setSaved(updated);
      setDefaultLevel(updated.defaultLevel);
      setDailyQuestionCount(updated.dailyQuestionCount);
      setMessage('Pengaturan berhasil disimpan.');
    } catch {
      setMessage('Pengaturan belum dapat disimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        onClick={leave}
        type='button'
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke Grammar
      </button>
      <header className='mt-8 border-b border-border pb-8'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Pengaturan Grammar</h1>
      </header>

      <div className='mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]'>
        <form onSubmit={submit}>
          <fieldset disabled={saving}>
            <SettingsLevelPicker
              description='Pilih level CEFR default untuk latihan grammar baru.'
              level={defaultLevel}
              savedLevel={saved.defaultLevel}
              onChange={setDefaultLevel}
            />

            <section className='mt-9 border-t border-border pt-8'>
              <h2 className='text-xl font-semibold text-ink'>Latihan harian</h2>
              <SettingsNumberField
                divided
                disabled={saving}
                id='grammar-daily-question-count'
                label='Jumlah soal per latihan'
                max={100}
                min={1}
                unit='soal'
                value={dailyQuestionCount}
                onChange={setDailyQuestionCount}
              />
              <p className={classNames('mt-3 text-sm', valid ? 'text-ink-muted' : 'text-danger')}>
                {valid
                  ? 'Digunakan untuk latihan grammar dari daily practice.'
                  : 'Masukkan bilangan bulat dari 1 sampai 100.'}
              </p>
            </section>
          </fieldset>

          <Button className='mt-8 min-w-52' disabled={!dirty || !valid} pending={saving} type='submit'>
            Simpan perubahan
          </Button>
          {message === undefined ? null : (
            <p className='mt-3 text-sm text-ink-muted' role='status'>
              {message}
            </p>
          )}
          <p className='mt-4 text-sm text-ink-muted'>Terakhir diperbarui {formatDate(saved.updatedAt)}</p>
        </form>
        <Summary settings={saved} />
      </div>
    </>
  );
};

const GrammarSettingsPage = () => {
  const settings = useApiQuery('grammar-settings', getGrammarSettings);
  if (settings.status === 'loading') return <LoadingState />;
  if (settings.status === 'error') return <ErrorState onRetry={settings.retry} />;
  return <SettingsForm initial={settings.data} />;
};

export default GrammarSettingsPage;
