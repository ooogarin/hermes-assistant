import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from './button';
import { Chip } from './chip';
import { Field, Input } from './form-field';

type TagInputProps = {
  addLabel?: string;
  disabled?: boolean;
  label: string;
  maxItems?: number;
  maxLength?: number;
  lowercase?: boolean;
  onChange: (value: string[]) => void;
  placeholder?: string;
  value: string[];
};

export const TagInput = ({
  addLabel = 'Tambah',
  disabled,
  label,
  maxItems = 50,
  maxLength = 64,
  lowercase = false,
  onChange,
  placeholder = 'Tulis tag',
  value,
}: TagInputProps) => {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string>();

  const addTag = () => {
    const trimmedTag = draft.trim();
    const tag = lowercase ? trimmedTag.toLowerCase() : trimmedTag;
    if (tag.length === 0) return;
    if (tag.length > maxLength) {
      setError(`Tag maksimal ${maxLength} karakter.`);
      return;
    }
    if (value.some((current) => (lowercase ? current.toLowerCase() : current) === tag)) {
      setError('Tag sudah ditambahkan.');
      return;
    }
    if (value.length >= maxItems) {
      setError(`Maksimal ${maxItems} tag.`);
      return;
    }

    onChange([...value, tag]);
    setDraft('');
    setError(undefined);
  };

  return (
    <Field error={error} htmlFor={inputId} label={label} messageId={messageId}>
      <div
        className='rounded-control border border-border-strong bg-surface p-2 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'
        aria-invalid={error === undefined ? undefined : true}
      >
        {value.length === 0 ? null : (
          <div className='mb-2 flex flex-wrap gap-1.5'>
            {value.map((tag) => (
              <Chip
                disabled={disabled}
                key={tag}
                onRemove={() => onChange(value.filter((current) => current !== tag))}
                removeLabel={`Hapus tag ${tag}`}
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}
        <div className='flex gap-2'>
          <Input
            aria-describedby={error === undefined ? undefined : messageId}
            className='min-h-9 border-0 px-2 focus:ring-0'
            disabled={disabled}
            id={inputId}
            maxLength={maxLength}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error !== undefined) setError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addTag();
            }}
            placeholder={placeholder}
            value={draft}
          />
          <Button
            disabled={disabled || draft.trim().length === 0}
            icon={<Plus aria-hidden='true' size={16} />}
            label={addLabel}
            onClick={addTag}
            size='sm'
            variant='secondary'
          />
        </div>
      </div>
    </Field>
  );
};
