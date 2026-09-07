import { Search, X } from 'lucide-react';
import { Button } from './button';

type SearchFormProps = {
  label: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder: string;
  value: string;
};

export const SearchForm = ({ label, onChange, onSearch, placeholder, value }: SearchFormProps) => {
  const canSearch = value.trim().length > 0;
  const inputId = `${label.toLowerCase().replaceAll(' ', '-')}-search`;

  return (
    <form
      className='flex h-12 flex-1 items-center gap-1.5 rounded-control border border-border bg-surface p-1.5 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'
      onSubmit={(event) => {
        event.preventDefault();
        if (canSearch) onSearch();
      }}
    >
      <div className='flex min-w-0 flex-1 items-center gap-2 px-2 pr-1'>
        <Search aria-hidden='true' className='shrink-0 text-ink-muted' size={20} />
        <label className='sr-only' htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          className='min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none focus:outline-none focus-visible:outline-none'
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {value.length > 0 ? (
        <button
          type='button'
          className='inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink'
          aria-label={`Kosongkan ${label.toLowerCase()}`}
          onClick={() => onChange('')}
        >
          <X aria-hidden='true' size={18} />
        </button>
      ) : null}
      <Button className='min-h-9! h-9! shrink-0 px-5' disabled={!canSearch} type='submit'>
        Cari
      </Button>
    </form>
  );
};
