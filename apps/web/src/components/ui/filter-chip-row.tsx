import { FilterChip } from './filter-chip';

export type FilterChipOption<Value extends string = string> = {
  label: string;
  value?: Value;
};

type FilterChipRowProps<Value extends string> = {
  /** Accessible name of the group. */
  label: string;
  onChange: (value?: Value) => void;
  options: Array<FilterChipOption<Value>>;
  /** The option that is currently active. */
  value?: Value;
};

/** A row of quick filters, where one option is active at a time. */
export const FilterChipRow = <Value extends string>({ label, onChange, options, value }: FilterChipRowProps<Value>) => (
  <fieldset className='flex flex-wrap gap-2'>
    <legend className='sr-only'>{label}</legend>
    {options.map((option) => (
      <FilterChip
        key={option.label}
        active={value === option.value}
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </FilterChip>
    ))}
  </fieldset>
);
