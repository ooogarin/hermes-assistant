import { forwardRef, useId } from 'react';
import { classNames } from '../../lib/class-names';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export const controlClassName =
  'min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-ink outline-none transition-shadow placeholder:text-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-ink-muted aria-invalid:border-danger aria-invalid:focus:ring-danger/15';

type FieldProps = {
  children: ReactNode;
  error?: string;
  helper?: string;
  htmlFor?: string;
  label: string;
  messageId?: string;
};

export const Field = ({ children, error, helper, htmlFor, label, messageId }: FieldProps) => {
  const message = error ?? helper;

  return (
    <div className='grid gap-2'>
      {htmlFor === undefined ? (
        <span className='text-sm font-medium text-ink'>{label}</span>
      ) : (
        <label className='text-sm font-medium text-ink' htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {message === undefined ? null : (
        <span
          className={classNames('text-xs font-normal', error === undefined ? 'text-ink-muted' : 'text-danger')}
          id={messageId}
        >
          {message}
        </span>
      )}
    </div>
  );
};

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input className={classNames(controlClassName, className)} ref={ref} {...props} />,
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={classNames(controlClassName, 'min-h-40 resize-y py-3 leading-7', className)}
      ref={ref}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';

type FieldLabelProps = { error?: string; helper?: string; label: string };

export const TextField = ({
  className,
  error,
  helper,
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldLabelProps) => (
  <TextFieldContent className={className} error={error} helper={helper} id={id} label={label} {...props} />
);

const TextFieldContent = ({
  className,
  error,
  helper,
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldLabelProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = error === undefined && helper === undefined ? undefined : `${inputId}-message`;

  return (
    <Field error={error} helper={helper} htmlFor={inputId} label={label} messageId={messageId}>
      <Input
        aria-describedby={messageId}
        aria-invalid={error === undefined ? undefined : true}
        className={className}
        id={inputId}
        {...props}
      />
    </Field>
  );
};

export const TextAreaField = ({
  className,
  error,
  helper,
  id,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldLabelProps) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = error === undefined && helper === undefined ? undefined : `${textareaId}-message`;

  return (
    <Field error={error} helper={helper} htmlFor={textareaId} label={label} messageId={messageId}>
      <Textarea
        aria-describedby={messageId}
        aria-invalid={error === undefined ? undefined : true}
        className={className}
        id={textareaId}
        {...props}
      />
    </Field>
  );
};
