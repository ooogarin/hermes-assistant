import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { FilterChip } from '../ui/filter-chip';
import { FilterDropdown } from '../ui/filter-dropdown';
import { FilterPopover } from '../ui/filter-popover';
import { SearchForm } from '../ui/search-form';
import type { NoteType } from '../../features/notes/notes-api';

type NotesToolbarProps = {
  activeFilterCount: number;
  activeType?: NoteType;
  category: string;
  filtersOpen: boolean;
  onApply: () => void;
  onCategoryChange: (value: string) => void;
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

const typeOptions: Array<{ label: string; value?: NoteType }> = [
  { label: 'Semua' },
  { label: 'Fact', value: 'fact' },
  { label: 'Personal', value: 'personal' },
  { label: 'Idea', value: 'idea' },
  { label: 'Quote', value: 'quote' },
];

export const NotesToolbar = ({
  activeFilterCount,
  activeType,
  category,
  filtersOpen,
  onApply,
  onCategoryChange,
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
              <FilterDropdown<NoteType | ''>
                label='Filter tipe catatan'
                onChange={(value) => onTypeChange(value === '' ? undefined : value)}
                options={typeOptions.map((option) => ({ label: option.label, value: option.value ?? '' }))}
                placeholder='Semua tipe'
                searchPlaceholder='Cari tipe...'
                value={selectedType ?? ''}
              />
            </div>
            <label className='grid gap-2 text-sm font-medium text-ink'>
              Kategori
              <input
                className='min-h-11 rounded-control border border-border bg-surface px-3 font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
                placeholder='Semua kategori'
                value={category}
                onChange={(event) => onCategoryChange(event.target.value)}
              />
            </label>
            <label className='grid gap-2 text-sm font-medium text-ink'>
              Tag
              <input
                className='min-h-11 rounded-control border border-border bg-surface px-3 font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
                placeholder='Semua tag'
                value={tag}
                onChange={(event) => onTagChange(event.target.value)}
              />
            </label>
            <label className='grid gap-2 text-sm font-medium text-ink'>
              Sumber
              <input
                className='min-h-11 rounded-control border border-border bg-surface-subtle px-3 font-normal text-ink-muted outline-none disabled:cursor-not-allowed'
                disabled
                placeholder='Semua sumber'
                title='Filter sumber belum didukung oleh API.'
              />
            </label>
            <div className='grid gap-2 text-sm font-medium text-ink'>
              Rentang tanggal
              <div className='grid grid-cols-2 gap-3'>
                <label className='sr-only' htmlFor='notes-date-from'>
                  Dari tanggal
                </label>
                <input
                  id='notes-date-from'
                  className='min-h-11 min-w-0 rounded-control border border-border bg-surface-subtle px-3 font-normal text-ink-muted outline-none disabled:cursor-not-allowed'
                  disabled
                  type='date'
                  title='Filter rentang tanggal belum didukung oleh API.'
                />
                <label className='sr-only' htmlFor='notes-date-to'>
                  Sampai tanggal
                </label>
                <input
                  id='notes-date-to'
                  className='min-h-11 min-w-0 rounded-control border border-border bg-surface-subtle px-3 font-normal text-ink-muted outline-none disabled:cursor-not-allowed'
                  disabled
                  type='date'
                  title='Filter rentang tanggal belum didukung oleh API.'
                />
              </div>
            </div>
          </div>
          <p className='mt-4 text-xs leading-5 text-ink-muted'>
            Sumber, rentang tanggal, dan urutan lama menunggu dukungan API.
          </p>
          <div className='mt-5 flex items-center justify-between gap-3'>
            <Button variant='ghost' onClick={onReset}>
              Reset
            </Button>
            <Button onClick={onApply}>Terapkan filter</Button>
          </div>
        </FilterPopover>

        <Button className='h-12' variant='secondary' disabled title='Urutan terlama belum didukung oleh API.'>
          Urutkan: Terbaru <ChevronDown aria-hidden='true' size={17} />
        </Button>
      </div>

      <section className='flex flex-wrap gap-2' aria-label='Filter tipe catatan'>
        {typeOptions.map((option) => (
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
