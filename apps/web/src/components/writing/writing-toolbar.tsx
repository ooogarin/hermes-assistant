import { ArrowDownUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { FilterChip } from '../ui/filter-chip';
import { FilterPopover } from '../ui/filter-popover';
import { SearchForm } from '../ui/search-form';
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
        <Button className='h-12' onClick={onSortChange} variant='secondary'>
          Urutkan: {sort === 'oldest' ? 'Terlama' : 'Terbaru'} <ArrowDownUp aria-hidden='true' size={17} />
        </Button>
      </div>
      <fieldset className='flex flex-wrap gap-2'>
        <legend className='sr-only'>Filter status</legend>
        {statuses.map((option) => (
          <FilterChip
            key={option.label}
            active={status === option.value}
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </fieldset>
    </div>
  );
};
