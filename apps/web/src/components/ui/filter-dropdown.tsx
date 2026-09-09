import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export type FilterDropdownOption<Value extends string = string> = { label: string; value: Value };

type FilterDropdownBaseProps<Value extends string> = {
  label: string;
  options: Array<FilterDropdownOption<Value>>;
  placeholder: string;
  searchPlaceholder?: string;
};

type FilterDropdownProps<Value extends string> = FilterDropdownBaseProps<Value> &
  (
    | { multiple?: false; onChange: (value: Value) => void; value: Value }
    | { multiple: true; onChange: (value: Value[]) => void; value: Value[] }
  );

export const FilterDropdown = <Value extends string>(props: FilterDropdownProps<Value>) => {
  const { label, options, placeholder, searchPlaceholder = 'Cari...' } = props;
  const id = useId();
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedValues = props.multiple ? props.value : [props.value];
  const selectedOptions = selectedValues.map(
    (value) => options.find((option) => option.value === value) ?? { label: value, value },
  );
  const selectedLabel = selectedOptions[0]?.label ?? placeholder;
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));

  const selectOption = (value: Value) => {
    if (!props.multiple) {
      props.onChange(value);
      return;
    }

    props.onChange(
      props.value.includes(value) ? props.value.filter((selected) => selected !== value) : [...props.value, value],
    );
  };

  useEffect(() => {
    if (!open) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnPointerDown);
    return () => document.removeEventListener('pointerdown', closeOnPointerDown);
  }, [open]);

  return (
    <fieldset
      aria-label={label}
      className={`relative border-0 p-0 ${props.multiple ? 'w-full lg:w-72 lg:shrink-0' : 'min-w-40'}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }}
      ref={containerRef}
    >
      {props.multiple ? (
        <div className='relative flex min-h-11 w-full items-center gap-2 rounded-control border border-border-strong bg-surface px-2 text-sm text-ink transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'>
          <button
            aria-controls={`${id}-options`}
            aria-expanded={open}
            aria-haspopup='listbox'
            aria-label={`${open ? 'Tutup' : 'Buka'} ${label.toLowerCase()}`}
            className='absolute inset-0 z-0 cursor-pointer rounded-control outline-none'
            onClick={() => setOpen((current) => !current)}
            ref={triggerRef}
            type='button'
          />
          <div className='pointer-events-none relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5'>
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <span
                  className='inline-flex min-h-7 items-center gap-1 rounded-full border border-primary/25 bg-primary-soft px-2.5 text-primary'
                  key={option.value}
                >
                  {option.label}
                  <button
                    aria-label={`Hapus ${option.label}`}
                    className='pointer-events-auto rounded-full p-0.5 hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20'
                    onClick={() => selectOption(option.value)}
                    type='button'
                  >
                    <X aria-hidden='true' size={14} />
                  </button>
                </span>
              ))
            ) : (
              <span className='px-1 text-ink-muted'>{placeholder}</span>
            )}
          </div>
          {selectedOptions.length > 0 ? (
            <button
              aria-label={`Hapus semua ${label.toLowerCase()}`}
              className='relative z-10 grid size-8 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary/20'
              onClick={() => props.onChange([])}
              type='button'
            >
              <X aria-hidden='true' size={18} />
            </button>
          ) : null}
          {open ? (
            <ChevronUp
              aria-hidden='true'
              className='pointer-events-none relative z-10 shrink-0 text-ink-muted'
              size={18}
            />
          ) : (
            <ChevronDown
              aria-hidden='true'
              className='pointer-events-none relative z-10 shrink-0 text-ink-muted'
              size={18}
            />
          )}
        </div>
      ) : (
        <button
          aria-controls={`${id}-options`}
          aria-expanded={open}
          aria-haspopup='listbox'
          aria-label={label}
          className='flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-border-strong bg-surface px-3 text-left text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15'
          onClick={() => setOpen((current) => !current)}
          ref={triggerRef}
          type='button'
        >
          <span className={props.value === '' ? 'text-ink-muted' : undefined}>{selectedLabel}</span>
          {open ? (
            <ChevronUp aria-hidden='true' className='shrink-0 text-ink-muted' size={18} />
          ) : (
            <ChevronDown aria-hidden='true' className='shrink-0 text-ink-muted' size={18} />
          )}
        </button>
      )}

      {open ? (
        <div
          className='absolute top-full left-0 z-30 mt-2 w-full min-w-64 rounded-surface border border-border-strong bg-surface p-3 shadow-lg'
          id={`${id}-options`}
        >
          <label className='flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'>
            <Search aria-hidden='true' className='shrink-0 text-ink-muted' size={19} />
            <span className='sr-only'>{searchPlaceholder}</span>
            <input
              className='min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted'
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              value={query}
            />
          </label>

          <div className='mt-3 max-h-64 overflow-y-auto border-t border-border' role='listbox' aria-label={label}>
            {filteredOptions.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <div className='border-b border-border last:border-b-0' key={option.value || 'all'}>
                  <button
                    aria-selected={selected}
                    className='flex min-h-12 w-full items-center gap-3 px-2 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-subtle'
                    onClick={() => selectOption(option.value)}
                    role='option'
                    type='button'
                  >
                    <span
                      aria-hidden='true'
                      className={`grid size-5 shrink-0 place-items-center rounded border ${
                        selected ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface'
                      }`}
                    >
                      {selected ? <Check size={14} strokeWidth={2.5} /> : null}
                    </span>
                    <span>{option.label}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {filteredOptions.length === 0 ? (
            <p className='px-2 py-5 text-sm text-ink-muted'>Pilihan tidak ditemukan.</p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
};
