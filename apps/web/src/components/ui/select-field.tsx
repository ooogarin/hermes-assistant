import { useId } from 'react';
import { classNames } from '../../lib/class-names';
import type { SelectHTMLAttributes } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string;
  helperText?: string;
  label: string;
};

export const SelectField = ({ className, error, helperText, id, label, ...props }: SelectFieldProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const message = error ?? helperText;
  const messageId = message === undefined ? undefined : `${selectId}-message`;

  return (
    <label className='grid gap-2 text-sm font-medium text-ink' htmlFor={selectId}>
      {label}
      <select
        id={selectId}
        className={classNames(
          'min-h-11 rounded-control border bg-surface px-3 py-2 text-sm text-ink transition-colors',
          'disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-ink-muted',
          error === undefined ? 'border-border-strong' : 'border-danger',
          className,
        )}
        aria-describedby={messageId}
        aria-invalid={error === undefined ? undefined : true}
        {...props}
      />
      {message === undefined ? null : (
        <span
          id={messageId}
          className={classNames('text-xs font-normal', error === undefined ? 'text-ink-muted' : 'text-danger')}
        >
          {message}
        </span>
      )}
    </label>
  );
};
