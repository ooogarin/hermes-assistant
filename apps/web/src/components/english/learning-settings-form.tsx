import { ArrowLeft } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classNames } from '../../lib/class-names';
import { formatDate } from '../../lib/formatting/formatters';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { Input } from '../ui/form-field';
import { LearningSettingsSummary } from './learning-settings-summary';
import { SettingsLevelPicker, SettingsNumberField } from './settings-parts';
import type { FormEvent } from 'react';
import type { LearningSettings, LearningSettingsInput } from './learning-settings';

type LearningSettingsFormProps = {
  feature: 'Reading' | 'Writing';
  initial: LearningSettings;
  lengthLabel: string;
  updateSettings: (input: LearningSettingsInput) => Promise<LearningSettings>;
};

const toInput = (settings: LearningSettings): LearningSettingsInput => ({
  defaultLevel: settings.defaultLevel,
  ...(settings.defaultQuestionCount === undefined ? {} : { defaultQuestionCount: settings.defaultQuestionCount }),
  defaultWordCount: settings.defaultWordCount,
  maxWordCount: settings.maxWordCount,
  minWordCount: settings.minWordCount,
});

const NumberField = ({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) => {
  const inputId = useId();

  return (
    <SettingsNumberField
      disabled={disabled}
      id={inputId}
      label={label}
      max={20_000}
      min={1}
      unit='kata'
      value={value}
      onChange={onChange}
    />
  );
};

export const LearningSettingsForm = ({ feature, initial, lengthLabel, updateSettings }: LearningSettingsFormProps) => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState<LearningSettingsInput>(() => toInput(initial));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const dirty = useMemo(
    () =>
      values.defaultLevel !== saved.defaultLevel ||
      values.defaultQuestionCount !== saved.defaultQuestionCount ||
      values.defaultWordCount !== saved.defaultWordCount ||
      values.minWordCount !== saved.minWordCount ||
      values.maxWordCount !== saved.maxWordCount,
    [saved, values],
  );
  const valid =
    Object.entries(values).every(([key, value]) =>
      typeof value === 'number'
        ? Number.isInteger(value) && (key === 'defaultQuestionCount' ? value >= 0 && value <= 20 : value > 0)
        : true,
    ) &&
    values.minWordCount <= values.defaultWordCount &&
    values.defaultWordCount <= values.maxWordCount;
  const rootPath = `/english/${feature.toLowerCase()}`;
  const canLeave = useUnsavedChanges(dirty);

  const leave = () => {
    if (canLeave()) navigate(rootPath);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    setMessage(undefined);
    try {
      const updated = await updateSettings(values);
      setSaved(updated);
      setValues(toInput(updated));
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
        Kembali ke {feature}
      </button>
      <header className='mt-8 border-b border-border pb-8'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Pengaturan {feature}</h1>
      </header>

      <div className='mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]'>
        <form onSubmit={submit}>
          <fieldset disabled={saving}>
            <SettingsLevelPicker
              description={`Pilih level CEFR default untuk materi ${feature.toLowerCase()} baru.`}
              level={values.defaultLevel}
              savedLevel={saved.defaultLevel}
              onChange={(level) => setValues((current) => ({ ...current, defaultLevel: level }))}
            />

            <section className='mt-9 border-t border-border pt-8'>
              <h2 className='text-xl font-semibold text-ink'>{lengthLabel}</h2>
              <p className='mt-2 text-sm leading-6 text-ink-muted'>
                Tentukan target jumlah kata yang ideal serta rentang minimum dan maksimum.
              </p>
              <div className='mt-5 grid gap-4 sm:grid-cols-3'>
                <NumberField
                  disabled={saving}
                  label='Target (ideal)'
                  value={values.defaultWordCount}
                  onChange={(value) => setValues((current) => ({ ...current, defaultWordCount: value }))}
                />
                <NumberField
                  disabled={saving}
                  label='Minimum'
                  value={values.minWordCount}
                  onChange={(value) => setValues((current) => ({ ...current, minWordCount: value }))}
                />
                <NumberField
                  disabled={saving}
                  label='Maksimum'
                  value={values.maxWordCount}
                  onChange={(value) => setValues((current) => ({ ...current, maxWordCount: value }))}
                />
              </div>
              <p className={classNames('mt-4 text-sm', valid ? 'text-ink-muted' : 'text-danger')}>
                {valid
                  ? 'Target jumlah kata sebaiknya berada di antara minimum dan maksimum.'
                  : 'Gunakan bilangan bulat positif dengan minimum ≤ target ≤ maksimum.'}
              </p>
            </section>
            {feature === 'Reading' ? (
              <section className='mt-9 border-t border-border pt-8'>
                <h2 className='text-xl font-semibold text-ink'>Pertanyaan opsional</h2>
                <label className='mt-5 grid gap-2 text-sm font-medium text-ink' htmlFor='reading-question-count'>
                  Jumlah soal default
                  <Input
                    id='reading-question-count'
                    type='number'
                    min={0}
                    max={20}
                    step={1}
                    value={Number.isNaN(values.defaultQuestionCount) ? '' : (values.defaultQuestionCount ?? 3)}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, defaultQuestionCount: event.target.valueAsNumber }))
                    }
                  />
                </label>
                <p className='mt-3 text-sm text-ink-muted'>Pilih 0–20 soal. Gunakan 0 untuk bacaan tanpa pertanyaan.</p>
                {values.defaultQuestionCount !== undefined &&
                (!Number.isInteger(values.defaultQuestionCount) ||
                  values.defaultQuestionCount < 0 ||
                  values.defaultQuestionCount > 20) ? (
                  <p className='mt-2 text-sm text-danger' role='alert'>
                    Jumlah soal harus bilangan bulat antara 0 dan 20.
                  </p>
                ) : null}
              </section>
            ) : null}
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
        <LearningSettingsSummary settings={saved} />
      </div>
    </>
  );
};
