import { classNames } from '../../lib/class-names';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const inputClassName =
  'min-h-12 w-full rounded-control border border-border bg-surface px-4 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-surface-subtle';

type FieldLabelProps = { helper?: string; label: string };

const FieldLabel = ({ helper, label }: FieldLabelProps) => (
  <span>
    <span className='text-sm font-medium text-ink'>{label}</span>
    {helper === undefined ? null : <span className='ml-2 text-xs font-normal text-ink-muted'>{helper}</span>}
  </span>
);

export const TextField = ({
  className,
  helper,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldLabelProps) => (
  <label className='grid gap-2'>
    <FieldLabel helper={helper} label={label} />
    <input className={classNames(inputClassName, className)} {...props} />
  </label>
);

export const TextAreaField = ({
  className,
  helper,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldLabelProps) => (
  <label className='grid gap-2'>
    <FieldLabel helper={helper} label={label} />
    <textarea className={classNames(inputClassName, 'min-h-40 resize-y py-3 leading-7', className)} {...props} />
  </label>
);

export const parseTags = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
];
