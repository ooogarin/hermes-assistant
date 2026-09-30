import { ArrowDownUp } from 'lucide-react';
import { Button } from '../ui/button';
import { ChoiceDropdown } from '../ui/choice-dropdown';
import { FilterChip } from '../ui/filter-chip';
import { FilterPopover } from '../ui/filter-popover';
import { Input, TextField } from '../ui/form-field';
import { SearchForm } from '../ui/search-form';
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
            <div className='grid gap-2 text-sm font-medium text-ink'>
              Tipe
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
            </div>
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
            <div className='grid gap-2 text-sm font-medium text-ink'>
              Rentang tanggal
              <div className='grid grid-cols-2 gap-3'>
                <label className='sr-only' htmlFor='notes-date-from'>
                  Dari tanggal
                </label>
                <Input
                  id='notes-date-from'
                  className='min-w-0'
                  onChange={(event) => onFromChange(event.target.value)}
                  type='date'
                  value={from}
                />
                <label className='sr-only' htmlFor='notes-date-to'>
                  Sampai tanggal
                </label>
                <Input
                  id='notes-date-to'
                  className='min-w-0'
                  onChange={(event) => onToChange(event.target.value)}
                  type='date'
                  value={to}
                />
              </div>
            </div>
          </div>
          {dateRangeInvalid ? (
            <p className='text-sm text-danger'>Tanggal akhir harus sama atau setelah tanggal awal.</p>
          ) : null}
          <div className='mt-5 flex items-center justify-between gap-3'>
            <Button variant='ghost' onClick={onReset}>
              Reset
            </Button>
            <Button disabled={dateRangeInvalid} onClick={onApply}>
              Terapkan filter
            </Button>
          </div>
        </FilterPopover>

        <Button className='h-12' variant='secondary' onClick={onSortChange}>
          Urutkan: {sort === 'oldest' ? 'Terlama' : 'Terbaru'} <ArrowDownUp aria-hidden='true' size={17} />
        </Button>
      </div>

      <section className='flex flex-wrap gap-2' aria-label='Filter tipe catatan'>
        {quickTypeOptions.map((option) => (
          <FilterChip
            key={option.label}
            active={activeType === option.value}
            onClick={() => onQuickTypeChange(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </section>
    </div>
  );
};
