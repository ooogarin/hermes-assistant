import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { TextAreaField, TextField } from '../ui/form-field';
import { TagInput } from '../ui/tag-input';
import type { FormEvent } from 'react';

export type JunkFormValues = {
  category: string;
  contentText: string | null;
  sourceUrl: string | null;
  tags: string[];
  title: string | null;
};

type JunkFormProps = {
  cancelTo: string;
  initial?: JunkFormValues;
  onSubmit: (values: JunkFormValues) => Promise<void>;
  submitLabel: string;
};

const emptyValues: JunkFormValues = { category: '', contentText: null, sourceUrl: null, tags: [], title: null };
const optionalValue = (value: string): string | null => value.trim() || null;

export const JunkForm = ({ cancelTo, initial = emptyValues, onSubmit, submitLabel }: JunkFormProps) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial.title ?? '');
  const [category, setCategory] = useState(initial.category);
  const [contentText, setContentText] = useState(initial.contentText ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '');
  const [tags, setTags] = useState(initial.tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const validUrl = sourceUrl.trim() === '' || URL.canParse(sourceUrl.trim());
  const valid = category.trim().length > 0 && tags.length <= 50 && tags.every((tag) => tag.length <= 64) && validUrl;
  const dirty =
    title !== (initial.title ?? '') ||
    category !== initial.category ||
    contentText !== (initial.contentText ?? '') ||
    sourceUrl !== (initial.sourceUrl ?? '') ||
    tags.length !== initial.tags.length ||
    tags.some((tag, index) => tag !== initial.tags[index]);
  const canLeave = useUnsavedChanges(dirty);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        category: category.trim(),
        contentText: optionalValue(contentText),
        sourceUrl: optionalValue(sourceUrl),
        tags,
        title: optionalValue(title),
      });
    } catch {
      setError('Data belum dapat disimpan. Coba lagi.');
      setSaving(false);
    }
  };

  return (
    <form className='mt-7 rounded-surface border border-border bg-surface p-6 sm:p-8' onSubmit={submit}>
      <div className='grid gap-6'>
        <TextField
          disabled={saving}
          label='Judul'
          maxLength={300}
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
        <TextField
          disabled={saving}
          label='Kategori'
          maxLength={100}
          onChange={(event) => setCategory(event.target.value)}
          required
          value={category}
        />
        <TextAreaField
          disabled={saving}
          label='Deskripsi'
          maxLength={20_000}
          onChange={(event) => setContentText(event.target.value)}
          value={contentText}
        />
        <TextField
          disabled={saving}
          label='URL sumber'
          maxLength={2_000}
          onChange={(event) => setSourceUrl(event.target.value)}
          type='url'
          value={sourceUrl}
        />
        <TagInput disabled={saving} label='Tags' onChange={setTags} value={tags} />
      </div>
      {!valid && dirty ? (
        <p className='mt-4 text-sm text-danger'>Kategori wajib diisi, URL harus valid, dan maksimal 50 tag.</p>
      ) : null}
      {error === undefined ? null : (
        <p className='mt-4 text-sm text-danger' role='alert'>
          {error}
        </p>
      )}
      <div className='mt-8 flex flex-wrap gap-3'>
        <Button disabled={!dirty || !valid} pending={saving} type='submit'>
          {submitLabel}
        </Button>
        <Button disabled={saving} onClick={() => canLeave() && navigate(cancelTo)} variant='secondary'>
          Batal
        </Button>
      </div>
    </form>
  );
};
