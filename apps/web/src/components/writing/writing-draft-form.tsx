import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWritingSubmission } from '../../features/writing/writing-api';
import { countWritingWords } from '../../features/writing/writing-display';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { TextAreaField } from '../ui/form-field';
import type { FormEvent } from 'react';

export const WritingDraftForm = ({
  materialCode,
  targetWordCount,
}: {
  materialCode?: string;
  targetWordCount?: number;
}) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const valid = /\S/.test(draft) && draft.length <= 100_000;
  const wordCount = countWritingWords(draft);
  const canLeave = useUnsavedChanges(draft.length > 0);

  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!valid || saving) {
      return;
    }

    setSaving(true);
    setError(undefined);

    try {
      // Preserve spacing and line breaks; the saved text is the user's original writing.
      const submission = await createWritingSubmission(draft, materialCode);
      navigate(`/english/writing/submissions/${submission.code}`, {
        replace: true,
        state: { notice: 'Tulisan berhasil disimpan.' },
      });
    } catch {
      setError('Tulisan belum dapat disimpan. Coba lagi.');
      setSaving(false);
    }
  };

  return (
    <form className='space-y-6 rounded-surface border border-border bg-surface p-6 sm:p-8' onSubmit={save}>
      <TextAreaField
        className='min-h-80'
        disabled={saving}
        label='Tulisanmu'
        maxLength={100_000}
        onChange={(event) => setDraft(event.target.value)}
        placeholder='Mulai menulis di sini...'
        required
        value={draft}
      />
      <p className='text-sm text-ink-muted'>
        <strong className='text-ink'>{wordCount}</strong> kata
        {targetWordCount === undefined ? null : ` · Target ${targetWordCount} kata`}
      </p>
      {error === undefined ? null : (
        <p className='text-sm text-danger' role='alert'>
          {error}
        </p>
      )}
      <p className='text-sm text-ink-muted'>Analisis dapat diminta setelah tulisan disimpan.</p>
      <div className='flex flex-wrap gap-3'>
        <Button disabled={!valid} pending={saving} pendingLabel='Menyimpan…' type='submit'>
          Simpan tulisan
        </Button>
        <Button
          disabled={saving}
          onClick={() => {
            if (canLeave()) {
              navigate(materialCode === undefined ? '/english/writing' : '/english/writing/materials');
            }
          }}
          variant='secondary'
        >
          Batal
        </Button>
      </div>
    </form>
  );
};
