import { useId } from 'react';
import { classNames } from '../../lib/class-names';
import { controlClassName, Field } from './form-field';
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
    <Field error={error} helper={helperText} htmlFor={selectId} label={label} messageId={messageId}>
      <select
        id={selectId}
        className={classNames(
          controlClassName,
          'py-2',
          error === undefined ? 'border-border-strong' : 'border-danger',
          className,
        )}
        aria-describedby={messageId}
        aria-invalid={error === undefined ? undefined : true}
        {...props}
      />
    </Field>
  );
};
