import { useState } from 'react';
import { Button } from '../ui/button';
import { FilterChipRow } from '../ui/filter-chip-row';
import { FilterPopover } from '../ui/filter-popover';
import { SearchForm } from '../ui/search-form';
import { SortToggle } from '../ui/sort-toggle';
import type { ReactNode } from 'react';

type WritingToolbarProps<Status extends string> = {
  activeFilterCount: number;
  children: ReactNode;
  onApplyFilters: () => void;
  onOpenFilters: () => void;
  onQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onSearch: () => void;
  onSortChange: () => void;
  onStatusChange: (value?: Status) => void;
  query: string;
  searchLabel: string;
  sort: 'newest' | 'oldest';
  status?: Status;
  statuses: Array<{ label: string; value?: Status }>;
};

export const WritingToolbar = <Status extends string>({
  activeFilterCount,
  children,
  onApplyFilters,
  onOpenFilters,
  onQueryChange,
  onResetFilters,
  onSearch,
  onSortChange,
  onStatusChange,
  query,
  searchLabel,
  sort,
  status,
  statuses,
}: WritingToolbarProps<Status>) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
        <SearchForm
          label={searchLabel}
          onChange={onQueryChange}
          onSearch={onSearch}
          placeholder={`${searchLabel}...`}
          value={query}
        />
        <FilterPopover
          activeCount={activeFilterCount}
          id='writing-filters'
          label='Filter Writing'
          onClose={() => setFiltersOpen(false)}
          onToggle={() => {
            if (!filtersOpen) {
              onOpenFilters();
            }

            setFiltersOpen(!filtersOpen);
          }}
          open={filtersOpen}
        >
          <div className='space-y-4'>{children}</div>
          <div className='mt-5 flex items-center justify-between gap-3'>
            <Button onClick={onResetFilters} variant='ghost'>
              Reset
            </Button>
            <Button
              onClick={() => {
                onApplyFilters();
                setFiltersOpen(false);
              }}
            >
              Terapkan filter
            </Button>
          </div>
        </FilterPopover>
        <SortToggle onToggle={onSortChange} sort={sort} />
      </div>
      <FilterChipRow label='Filter status' onChange={onStatusChange} options={statuses} value={status} />
    </div>
  );
};
