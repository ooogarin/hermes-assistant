import { useState } from 'react';
import { ContentForm } from '../personal-content/content-form';
import { TextAreaField, TextField } from '../ui/form-field';
import { TagInput } from '../ui/tag-input';

export type JunkFormValues = {
  category: string;
  contentText: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  tags: string[];
  title: string | null;
};

type JunkFormProps = {
  cancelTo: string;
  hasRawText?: boolean;
  initial?: JunkFormValues;
  onSubmit: (values: JunkFormValues) => Promise<void>;
  submitLabel: string;
};

type JunkFormState = {
  category: string;
  contentText: string;
  sourceName: string;
  sourceUrl: string;
  tags: string[];
  title: string;
};

const emptyValues: JunkFormValues = {
  category: '',
  contentText: null,
  sourceName: null,
  sourceUrl: null,
  tags: [],
  title: null,
};

const toState = (values: JunkFormValues): JunkFormState => ({
  category: values.category,
  contentText: values.contentText ?? '',
  sourceName: values.sourceName ?? '',
  sourceUrl: values.sourceUrl ?? '',
  tags: values.tags,
  title: values.title ?? '',
});

const optionalValue = (value: string): string | null => value.trim() || null;

const isValidUrl = (value: string): boolean =>
  value.trim() === '' || (URL.canParse(value.trim()) && ['http:', 'https:'].includes(new URL(value.trim()).protocol));

export const JunkForm = ({
  cancelTo,
  hasRawText = false,
  initial = emptyValues,
  onSubmit,
  submitLabel,
}: JunkFormProps) => {
  const [state] = useState(() => toState(initial));

  return (
    <ContentForm<JunkFormState>
      cancelTo={cancelTo}
      initial={state}
      invalidMessage='Kategori dan minimal salah satu judul, deskripsi, atau URL wajib diisi. URL harus HTTP(S), maksimal 50 tag.'
      isValid={(values) =>
        values.category.trim().length > 0 &&
        (hasRawText || [values.title, values.contentText, values.sourceUrl].some((value) => value.trim().length > 0)) &&
        values.tags.length <= 50 &&
        values.tags.every((tag) => tag.length <= 64) &&
        isValidUrl(values.sourceUrl)
      }
      onSubmit={async (values) =>
        onSubmit({
          category: values.category.trim(),
          contentText: optionalValue(values.contentText),
          sourceName: optionalValue(values.sourceName),
          sourceUrl: optionalValue(values.sourceUrl),
          tags: values.tags,
          title: optionalValue(values.title),
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
            value={values.title}
          />
          <TextField
            disabled={saving}
            label='Kategori'
            maxLength={100}
            onChange={(event) => setValue('category', event.target.value)}
            required
            value={values.category}
          />
          <TextAreaField
            disabled={saving}
            label='Deskripsi'
            maxLength={20_000}
            onChange={(event) => setValue('contentText', event.target.value)}
            value={values.contentText}
          />
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
            placeholder='Contoh: YouTube atau nama penerbit'
            value={values.sourceName}
          />
          <p className='-mt-4 text-sm text-ink-muted'>Jika kosong, nama platform atau domain akan digunakan.</p>
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
