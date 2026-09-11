import { Search, X } from 'lucide-react';
import { useId } from 'react';
import { Button } from './button';
import type { ReactNode } from 'react';

type SearchFieldProps = {
  clearLabel?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  value: string;
};

export const SearchField = ({
  clearLabel,
  disabled,
  icon = <Search aria-hidden='true' className='shrink-0 text-ink-muted' size={20} />,
  label,
  onChange,
  onClear,
  placeholder,
  value,
}: SearchFieldProps) => {
  const inputId = useId();

  return (
    <div className='flex min-w-0 flex-1 items-center gap-2 px-2 pr-1'>
      {icon}
      <label className='sr-only' htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className='min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none focus:outline-none focus-visible:outline-none'
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value.length > 0 ? (
        <Button
          aria-label={clearLabel ?? `Kosongkan ${label.toLowerCase()}`}
          className='size-8! min-h-0! border-0 text-ink-muted'
          disabled={disabled}
          icon={<X aria-hidden='true' size={18} />}
          onClick={onClear ?? (() => onChange(''))}
          size='icon'
          variant='ghost'
        />
      ) : null}
    </div>
  );
};

type SearchFormProps = SearchFieldProps & {
  actionIcon?: ReactNode;
  actionLabel?: string;
  onSearch: () => void;
};

export const SearchForm = ({
  actionIcon,
  actionLabel = 'Cari',
  disabled,
  onSearch,
  value,
  ...props
}: SearchFormProps) => {
  const canSearch = value.trim().length > 0;

  return (
    <form
      className='flex h-12 flex-1 items-center gap-1.5 rounded-control border border-border bg-surface p-1.5 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'
      onSubmit={(event) => {
        event.preventDefault();
        if (canSearch) onSearch();
      }}
    >
      <SearchField disabled={disabled} value={value} {...props} />
      <Button
        className='shrink-0 px-5'
        disabled={disabled || !canSearch}
        icon={actionIcon}
        label={actionLabel}
        size='sm'
        type='submit'
      />
    </form>
  );
};
