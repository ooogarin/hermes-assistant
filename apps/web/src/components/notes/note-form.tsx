import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { parseTags, TextAreaField, TextField } from '../ui/form-field';
import type { FormEvent } from 'react';
import type { NoteType } from '../../features/notes/notes-api';

export type NoteFormValues = {
  category: string;
  content: string;
  source: string | null;
  tags: string[];
  title: string;
  type: NoteType;
};

type NoteFormProps = {
  cancelTo: string;
  initial?: NoteFormValues;
  onSubmit: (values: NoteFormValues) => Promise<void>;
  submitLabel: string;
};

const noteTypes: NoteType[] = ['fact', 'personal', 'news', 'quote', 'idea', 'reminder'];
const emptyValues: NoteFormValues = { category: '', content: '', source: null, tags: [], title: '', type: 'fact' };

export const NoteForm = ({ cancelTo, initial = emptyValues, onSubmit, submitLabel }: NoteFormProps) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [type, setType] = useState(initial.type);
  const [category, setCategory] = useState(initial.category);
  const [source, setSource] = useState(initial.source ?? '');
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const parsedTags = useMemo(() => parseTags(tags), [tags]);
  const valid =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    category.trim().length > 0 &&
    parsedTags.length <= 50 &&
    parsedTags.every((tag) => tag.length <= 64);
  const dirty =
    title !== initial.title ||
    content !== initial.content ||
    type !== initial.type ||
    category !== initial.category ||
    source !== (initial.source ?? '') ||
    tags !== initial.tags.join(', ');
  const canLeave = useUnsavedChanges(dirty);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        category: category.trim(),
        content: content.trim(),
        source: source.trim() || null,
        tags: parsedTags,
        title: title.trim(),
        type,
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
          required
          value={title}
        />
        <TextAreaField
          disabled={saving}
          label='Isi catatan'
          maxLength={20_000}
          onChange={(event) => setContent(event.target.value)}
          required
          value={content}
        />
        <div className='grid gap-5 sm:grid-cols-2'>
          <label className='grid gap-2 text-sm font-medium text-ink'>
            Tipe
            <select
              className='min-h-12 rounded-control border border-border bg-surface px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
              disabled={saving}
              onChange={(event) => setType(event.target.value as NoteType)}
              value={type}
            >
              {noteTypes.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <TextField
            disabled={saving}
            label='Kategori'
            maxLength={100}
            onChange={(event) => setCategory(event.target.value)}
            required
            value={category}
          />
        </div>
        <TextField
          disabled={saving}
          label='Sumber'
          maxLength={500}
          onChange={(event) => setSource(event.target.value)}
          value={source}
        />
        <TextField
          disabled={saving}
          helper='Pisahkan dengan koma'
          label='Tags'
          onChange={(event) => setTags(event.target.value)}
          value={tags}
        />
      </div>
      {!valid && dirty ? (
        <p className='mt-4 text-sm text-danger'>Judul, isi, dan kategori wajib diisi; maksimal 50 tag.</p>
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
