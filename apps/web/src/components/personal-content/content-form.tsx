import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import type { FormEvent, ReactNode } from 'react';

type FormValues = Record<string, string | string[]>;

type ContentFormProps<Values extends FormValues> = {
  /** Renders the fields of the form. */
  children: (
    values: Values,
    setValue: <Key extends keyof Values>(name: Key, value: Values[Key]) => void,
    saving: boolean,
  ) => ReactNode;
  /** The values the form starts with. */
  initial: Values;
  /** Checks whether the values may be saved. */
  isValid: (values: Values) => boolean;
  /** The message shown when the values may not be saved. */
  invalidMessage: string;
  /** Saves the values. */
  onSubmit: (values: Values) => Promise<void>;
  /** The label of the save button. */
  submitLabel: string;
  /** Where the reader goes when they cancel. */
  cancelTo: string;
};

const sameValue = (current: string | string[], original: string | string[]): boolean => {
  if (Array.isArray(current) && Array.isArray(original)) {
    return current.length === original.length && current.every((item, index) => item === original[index]);
  }

  return current === original;
};

/**
 * A form for a stored record. The container keeps the values, the dirty check,
 * and the save flow, the feature renders the fields and the rules.
 */
export const ContentForm = <Values extends FormValues>({
  cancelTo,
  children,
  initial,
  invalidMessage,
  isValid,
  onSubmit,
  submitLabel,
}: ContentFormProps<Values>) => {
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const dirty = Object.keys(values).some(
    (name) => !sameValue(values[name as keyof Values], initial[name as keyof Values]),
  );
  const valid = isValid(values);
  const canLeave = useUnsavedChanges(dirty);

  const setValue = <Key extends keyof Values>(name: Key, value: Values[Key]) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid) return;

    setSaving(true);
    setError(undefined);

    try {
      await onSubmit(values);
    } catch {
      setError('Data belum dapat disimpan. Coba lagi.');
      setSaving(false);
    }
  };

  return (
    <form className='mt-7 rounded-surface border border-border bg-surface p-6 sm:p-8' onSubmit={submit}>
      <div className='grid gap-6'>{children(values, setValue, saving)}</div>
      {!valid && dirty ? <p className='mt-4 text-sm text-danger'>{invalidMessage}</p> : null}
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
