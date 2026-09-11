import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { classNames } from '../../lib/class-names';
import { Chip } from './chip';
import { SearchField } from './search-form';

export type ChoiceOption<Value extends string = string> = {
  disabled?: boolean;
  keywords?: string[];
  label: string;
  value: Value;
};

type ChoiceDropdownBaseProps<Value extends string> = {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  label: string;
  options: Array<ChoiceOption<Value>>;
  placeholder: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

type ChoiceDropdownProps<Value extends string> = ChoiceDropdownBaseProps<Value> &
  (
    | { mode: 'single'; onChange: (value: Value | null) => void; value: Value | null }
    | { mode: 'multiple'; onChange: (value: Value[]) => void; value: Value[] }
  );

export const ChoiceDropdown = <Value extends string>(props: ChoiceDropdownProps<Value>) => {
  const {
    className,
    clearable = true,
    disabled,
    label,
    options,
    placeholder,
    searchable = true,
    searchPlaceholder = 'Cari...',
  } = props;
  const id = useId();
  const containerRef = useRef<HTMLFieldSetElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedValues = props.mode === 'multiple' ? props.value : props.value === null ? [] : [props.value];
  const selectedOptions = selectedValues.map(
    (value) => options.find((option) => option.value === value) ?? { label: value, value },
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    [option.label, ...(option.keywords ?? [])].some((text) => text.toLowerCase().includes(normalizedQuery)),
  );

  const selectOption = (value: Value) => {
    if (props.mode === 'single') {
      props.onChange(value);
      setOpen(false);
      return;
    }

    props.onChange(
      props.value.includes(value) ? props.value.filter((selected) => selected !== value) : [...props.value, value],
    );
  };

  const clear = () => {
    if (props.mode === 'single') props.onChange(null);
    else props.onChange([]);
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
      className={classNames('relative min-w-0 border-0 p-0', className)}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }}
      ref={containerRef}
    >
      <div
        className={classNames(
          'relative flex min-h-11 w-full items-center gap-2 rounded-control border border-border-strong bg-surface px-2 text-sm text-ink transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
          disabled && 'bg-surface-subtle text-ink-muted',
        )}
      >
        <button
          aria-controls={`${id}-options`}
          aria-expanded={open}
          aria-haspopup='listbox'
          aria-label={`${open ? 'Tutup' : 'Buka'} ${label.toLowerCase()}`}
          className='absolute inset-0 z-0 cursor-pointer rounded-control outline-none disabled:cursor-not-allowed'
          onClick={() => setOpen((current) => !current)}
          ref={triggerRef}
          type='button'
        />

        <div className='pointer-events-none relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5'>
          {selectedOptions.length === 0 ? <span className='px-1 text-ink-muted'>{placeholder}</span> : null}
          {props.mode === 'single' ? (
            <span className='truncate px-1'>{selectedOptions[0]?.label}</span>
          ) : (
            selectedOptions.map((option) => (
              <Chip
                className='pointer-events-auto'
                disabled={disabled}
                key={option.value}
                onRemove={() => selectOption(option.value)}
                removeLabel={`Hapus ${option.label}`}
              >
                {option.label}
              </Chip>
            ))
          )}
        </div>

        {clearable && selectedOptions.length > 0 ? (
          <button
            aria-label={`Hapus pilihan ${label.toLowerCase()}`}
            className='relative z-10 grid size-8 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-subtle hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed'
            onClick={clear}
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

      {open ? (
        <div
          className='absolute top-full left-0 z-30 mt-2 w-full min-w-64 rounded-surface border border-border-strong bg-surface p-3 shadow-lg'
          id={`${id}-options`}
        >
          {searchable ? (
            <div className='flex min-h-11 rounded-control border border-border-strong bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15'>
              <SearchField
                label={searchPlaceholder}
                onChange={setQuery}
                placeholder={searchPlaceholder}
                value={query}
              />
            </div>
          ) : null}

          <div
            aria-label={label}
            aria-multiselectable={props.mode === 'multiple' || undefined}
            className={classNames('max-h-64 overflow-y-auto', searchable && 'mt-3 border-t border-border')}
            role='listbox'
          >
            {filteredOptions.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <div className='border-b border-border last:border-b-0' key={option.value}>
                  <button
                    aria-selected={selected}
                    className='flex min-h-12 w-full items-center gap-3 px-2 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-55'
                    disabled={option.disabled}
                    onClick={() => selectOption(option.value)}
                    role='option'
                    type='button'
                  >
                    <span
                      aria-hidden='true'
                      className={classNames(
                        'grid size-5 shrink-0 place-items-center border',
                        props.mode === 'multiple' ? 'rounded' : 'rounded-full',
                        selected ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface',
                      )}
                    >
                      {selected ? (
                        props.mode === 'multiple' ? (
                          <Check size={14} strokeWidth={2.5} />
                        ) : (
                          <span className='size-2 rounded-full bg-current' />
                        )
                      ) : null}
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
