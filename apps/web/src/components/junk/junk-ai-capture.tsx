import { Button } from '../ui/button';
import { TextAreaField } from '../ui/form-field';

type JunkAiCaptureProps = {
  error?: string;
  onChangeText: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  text: string;
};

export const JunkAiCapture = ({ error, onChangeText, onSave, saving, text }: JunkAiCaptureProps) => (
  <section className='mt-7 grid gap-4'>
    <p className='text-sm text-ink-muted'>
      Tulis pesan bebas. AI akan menyusun field Junk lalu langsung menyimpannya. Koreksi bisa dilakukan di halaman
      detail setelah item tersimpan.
    </p>
    <TextAreaField
      disabled={saving}
      helper='Contoh: artikel bagus soal rust https://blog.example.com/rust'
      label='Pesan'
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
