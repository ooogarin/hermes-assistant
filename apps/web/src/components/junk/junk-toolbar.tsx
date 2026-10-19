import { Button } from '../ui/button';
import { DateRangeFilter } from '../ui/date-range-filter';
import { FilterChipRow } from '../ui/filter-chip-row';
import { FilterPopover } from '../ui/filter-popover';
import { TextField } from '../ui/form-field';
import { SearchForm } from '../ui/search-form';
import { SortToggle } from '../ui/sort-toggle';

type JunkToolbarProps = {
  activeCategory?: string;
  activeFilterCount: number;
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
  onQuickCategoryChange: (value?: string) => void;
  onReset: () => void;
  onSearch: () => void;
  onSourceUrlChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onToggleFilters: () => void;
  query: string;
  sourceUrl: string;
  tag: string;
};

const categoryOptions: Array<{ label: string; value?: string }> = [
  { label: 'Semua' },
  { label: 'Artikel', value: 'article' },
  { label: 'Video', value: 'video' },
  { label: 'Musik', value: 'music' },
  { label: 'Quote', value: 'quote' },
  { label: 'Tool', value: 'tool' },
];

export const JunkToolbar = ({
  activeCategory,
  activeFilterCount,
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
  onQuickCategoryChange,
  onReset,
  onSearch,
  onSourceUrlChange,
  onTagChange,
  onToggleFilters,
  query,
  sourceUrl,
  tag,
}: JunkToolbarProps) => (
  <div className='space-y-4'>
    <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
      <SearchForm
        label='Cari Junk'
        onChange={onQueryChange}
        onSearch={onSearch}
        placeholder='Cari judul, kutipan, tag, sumber, atau kode...'
        value={query}
      />

      <FilterPopover
        activeCount={activeFilterCount}
        id='junk-filters'
        label='Filter Junk'
        onClose={onCloseFilters}
        onToggle={onToggleFilters}
        open={filtersOpen}
      >
        <div className='space-y-4'>
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
          <TextField
            label='URL sumber'
            onChange={(event) => onSourceUrlChange(event.target.value)}
            placeholder='https://example.com/...'
            type='url'
            value={sourceUrl}
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
      label='Filter kategori Junk'
      onChange={onQuickCategoryChange}
      options={categoryOptions}
      value={activeCategory}
    />
  </div>
);
