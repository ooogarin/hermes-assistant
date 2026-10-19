import { useState } from 'react';
import { ContentForm } from '../personal-content/content-form';
import { ChoiceDropdown } from '../ui/choice-dropdown';
import { Field, TextAreaField, TextField } from '../ui/form-field';
import { TagInput } from '../ui/tag-input';
import type { NoteType } from '../../features/notes/notes-api';

export type NoteFormValues = {
  category: string;
  contentText: string;
  sourceName: string | null;
  sourceUrl: string | null;
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

type NoteFormState = {
  category: string;
  contentText: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  title: string;
  type: NoteType;
};

const noteTypes: NoteType[] = ['fact', 'personal', 'news', 'quote', 'idea', 'reminder'];
const emptyValues: NoteFormValues = {
  category: '',
  contentText: '',
  sourceName: null,
  sourceUrl: null,
  tags: [],
  title: '',
  type: 'fact',
};

const toState = (values: NoteFormValues): NoteFormState => ({
  category: values.category,
  contentText: values.contentText,
  sourceName: values.sourceName ?? '',
  sourceUrl: values.sourceUrl ?? '',
  tags: values.tags,
  title: values.title,
  type: values.type,
});

const isValidUrl = (value: string): boolean =>
  value.trim() === '' || (URL.canParse(value.trim()) && ['http:', 'https:'].includes(new URL(value.trim()).protocol));

export const NoteForm = ({ cancelTo, initial = emptyValues, onSubmit, submitLabel }: NoteFormProps) => {
  const [state] = useState(() => toState(initial));

  return (
    <ContentForm<NoteFormState>
      cancelTo={cancelTo}
      initial={state}
      invalidMessage='Judul, isi, dan kategori wajib diisi; URL harus valid dan maksimal 50 tag.'
      isValid={(values) =>
        values.title.trim().length > 0 &&
        values.contentText.trim().length > 0 &&
        values.category.trim().length > 0 &&
        isValidUrl(values.sourceUrl) &&
        values.tags.length <= 50 &&
        values.tags.every((tag) => tag.length <= 64)
      }
      onSubmit={async (values) =>
        onSubmit({
          category: values.category.trim(),
          contentText: values.contentText.trim(),
          sourceName: values.sourceName.trim() || null,
          sourceUrl: values.sourceUrl.trim() || null,
          tags: values.tags,
          title: values.title.trim(),
          type: values.type,
        })
      }
      submitLabel={submitLabel}
    >
      {(values, setValue, saving) => (
        <>
          <TextField
            disabled={saving}
            label='Judul'
            maxLength={300}
            onChange={(event) => setValue('title', event.target.value)}
            required
            value={values.title}
          />
          <TextAreaField
            disabled={saving}
            label='Isi catatan'
            maxLength={20_000}
            onChange={(event) => setValue('contentText', event.target.value)}
            required
            value={values.contentText}
          />
          <div className='grid gap-5 sm:grid-cols-2'>
            <Field label='Tipe'>
              <ChoiceDropdown
                className='w-full'
                clearable={false}
                disabled={saving}
                label='Tipe'
                mode='single'
                onChange={(value) => value !== null && setValue('type', value)}
                options={noteTypes.map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value }))}
                placeholder='Pilih tipe'
                searchable={false}
                value={values.type}
              />
            </Field>
            <TextField
              disabled={saving}
              label='Kategori'
              maxLength={100}
              onChange={(event) => setValue('category', event.target.value)}
              required
              value={values.category}
            />
          </div>
          <TextField
            disabled={saving}
            label='URL sumber'
            maxLength={2_000}
            onChange={(event) => setValue('sourceUrl', event.target.value)}
            type='url'
            value={values.sourceUrl}
          />
          <TextField
            disabled={saving}
            label='Nama sumber (opsional)'
            maxLength={200}
            onChange={(event) => setValue('sourceName', event.target.value)}
            placeholder='Contoh: YouTube atau nama buku'
            value={values.sourceName}
          />
          <TagInput
            disabled={saving}
            label='Tags'
            lowercase
            onChange={(tags) => setValue('tags', tags)}
            value={values.tags}
          />
        </>
      )}
    </ContentForm>
  );
};
