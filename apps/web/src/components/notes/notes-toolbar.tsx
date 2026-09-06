import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { FilterChip } from '../ui/filter-chip';
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
  const filtersRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtersOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!filtersRef.current?.contains(event.target as Node)) onCloseFilters();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseFilters();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filtersOpen, onCloseFilters]);

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

        <div className='relative flex' ref={filtersRef}>
          <Button
            className='h-12 w-full lg:w-auto'
            variant='secondary'
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            aria-controls='notes-filters'
          >
            <SlidersHorizontal aria-hidden='true' size={18} />
            Filter
            {activeFilterCount > 0 ? (
              <span className='inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-white'>
                {activeFilterCount}
              </span>
            ) : null}
          </Button>

          {filtersOpen ? (
            <section
              id='notes-filters'
              className='absolute left-1/2 top-full z-10 mt-2 w-[min(24.5rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-surface border border-border bg-surface p-5 shadow-lg max-sm:left-auto max-sm:right-0 max-sm:translate-x-0'
              aria-label='Filter lanjutan'
            >
              <div className='space-y-4'>
                <fieldset className='grid gap-2 text-sm font-medium text-ink'>
                  <legend>Tipe</legend>
                  <div className='flex flex-wrap gap-1'>
                    {typeOptions.map((option) => (
                      <FilterChip
                        key={option.label}
                        active={selectedType === option.value}
                        onClick={() => onTypeChange(option.value)}
                      >
                        {option.label}
                      </FilterChip>
                    ))}
                  </div>
                </fieldset>
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
            </section>
          ) : null}
        </div>

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
