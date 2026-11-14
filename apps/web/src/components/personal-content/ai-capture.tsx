import { Button } from '../ui/button';
import { TextAreaField } from '../ui/form-field';

type AiCaptureProps = {
  description: string;
  error?: string;
  helper: string;
  label: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  text: string;
};

export const AiCapture = ({
  description,
  error,
  helper,
  label,
  onChangeText,
  onSave,
  saving,
  text,
}: AiCaptureProps) => (
  <section className='mt-7 grid gap-4'>
    <p className='text-sm text-ink-muted'>{description}</p>
    <TextAreaField
      disabled={saving}
      helper={helper}
      label={label}
      maxLength={20_000}
      onChange={(event) => onChangeText(event.target.value)}
      placeholder='Tulis apa saja yang ingin disimpan...'
      value={text}
    />
    {error === undefined ? null : (
      <p className='text-sm text-danger' role='alert'>
        {error}
      </p>
    )}
    <div className='flex flex-wrap gap-3'>
      <Button disabled={text.trim().length === 0} onClick={onSave} pending={saving} pendingLabel='Menyimpan dengan AI…'>
        Simpan dengan AI
      </Button>
    </div>
  </section>
);
