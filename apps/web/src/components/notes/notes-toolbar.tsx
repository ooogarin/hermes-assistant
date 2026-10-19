import { Button } from '../ui/button';
import { ChoiceDropdown } from '../ui/choice-dropdown';
import { DateRangeFilter } from '../ui/date-range-filter';
import { FilterChipRow } from '../ui/filter-chip-row';
import { FilterPopover } from '../ui/filter-popover';
import { Field, TextField } from '../ui/form-field';
import { SearchForm } from '../ui/search-form';
import { SortToggle } from '../ui/sort-toggle';
import type { NoteType } from '../../features/notes/notes-api';

type NotesToolbarProps = {
  activeFilterCount: number;
  activeType?: NoteType;
  category: string;
  from: string;
  to: string;
  source: string;
  sort: 'newest' | 'oldest';
  dateRangeInvalid: boolean;
  filtersOpen: boolean;
  onApply: () => void;
  onCategoryChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSortChange: () => void;
  onCloseFilters: () => void;
  onQueryChange: (value: string) => void;
  onQuickTypeChange: (value?: NoteType) => void;
  onReset: () => void;
  onSearch: () => void;
  onTagChange: (value: string) => void;
  onToggleFilters: () => void;
  onTypeChange: (value?: NoteType) => void;
  query: string;
  selectedType?: NoteType;
  tag: string;
};

const noteTypeOptions: Array<{ label: string; value: NoteType }> = [
  { label: 'Fact', value: 'fact' },
  { label: 'Personal', value: 'personal' },
  { label: 'News', value: 'news' },
  { label: 'Quote', value: 'quote' },
  { label: 'Idea', value: 'idea' },
  { label: 'Reminder', value: 'reminder' },
];

const quickTypeOptions: Array<{ label: string; value?: NoteType }> = [
  { label: 'Semua' },
  ...noteTypeOptions.filter(({ value }) => !['news', 'reminder'].includes(value)),
];

export const NotesToolbar = ({
  activeFilterCount,
  activeType,
  category,
  from,
  to,
  source,
  sort,
  dateRangeInvalid,
  filtersOpen,
  onApply,
  onCategoryChange,
  onFromChange,
  onToChange,
  onSourceChange,
  onSortChange,
  onCloseFilters,
  onQueryChange,
  onQuickTypeChange,
  onReset,
  onSearch,
  onTagChange,
  onToggleFilters,
  onTypeChange,
  query,
  selectedType,
  tag,
}: NotesToolbarProps) => {
  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
        <SearchForm
          label='Cari di catatan'
          onChange={onQueryChange}
          onSearch={onSearch}
          placeholder='Cari di catatan...'
          value={query}
        />

        <FilterPopover
          activeCount={activeFilterCount}
          id='notes-filters'
          label='Filter lanjutan Notes'
          onClose={onCloseFilters}
          onToggle={onToggleFilters}
          open={filtersOpen}
        >
          <div className='space-y-4'>
            <Field label='Tipe'>
              <ChoiceDropdown<NoteType>
                className='w-full'
                label='Filter tipe catatan'
                mode='single'
                onChange={(value) => onTypeChange(value ?? undefined)}
                options={noteTypeOptions}
                placeholder='Semua tipe'
                searchPlaceholder='Cari tipe...'
                value={selectedType ?? null}
              />
            </Field>
            <TextField
              label='Kategori'
              onChange={(event) => onCategoryChange(event.target.value)}
              placeholder='Semua kategori'
              value={category}
            />
            <TextField
              label='Tag'
              onChange={(event) => onTagChange(event.target.value)}
              placeholder='Semua tag'
              value={tag}
            />
            <TextField
              label='Sumber'
              onChange={(event) => onSourceChange(event.target.value)}
              placeholder='Nama atau domain sumber'
              value={source}
            />
            <DateRangeFilter
              from={from}
              invalid={dateRangeInvalid}
              onFromChange={onFromChange}
              onToChange={onToChange}
              to={to}
            />
          </div>
          <div className='mt-5 flex items-center justify-between gap-3'>
            <Button variant='ghost' onClick={onReset}>
              Reset
            </Button>
            <Button disabled={dateRangeInvalid} onClick={onApply}>
              Terapkan filter
            </Button>
          </div>
        </FilterPopover>

        <SortToggle onToggle={onSortChange} sort={sort} />
      </div>

      <FilterChipRow
        label='Filter tipe catatan'
        onChange={onQuickTypeChange}
        options={quickTypeOptions}
        value={activeType}
      />
    </div>
  );
};
