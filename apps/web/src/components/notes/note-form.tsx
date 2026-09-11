import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { ChoiceDropdown } from '../ui/choice-dropdown';
import { Field, TextAreaField, TextField } from '../ui/form-field';
import { TagInput } from '../ui/tag-input';
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
  const [tags, setTags] = useState(initial.tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const valid =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    category.trim().length > 0 &&
    tags.length <= 50 &&
    tags.every((tag) => tag.length <= 64);
  const dirty =
    title !== initial.title ||
    content !== initial.content ||
    type !== initial.type ||
    category !== initial.category ||
    source !== (initial.source ?? '') ||
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
        content: content.trim(),
        source: source.trim() || null,
        tags,
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
          <Field label='Tipe'>
            <ChoiceDropdown
              className='w-full'
              clearable={false}
              disabled={saving}
              label='Tipe'
              mode='single'
              onChange={(value) => value !== null && setType(value)}
              options={noteTypes.map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value }))}
              placeholder='Pilih tipe'
              searchable={false}
              value={type}
            />
          </Field>
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
        <TagInput disabled={saving} label='Tags' onChange={setTags} value={tags} />
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
