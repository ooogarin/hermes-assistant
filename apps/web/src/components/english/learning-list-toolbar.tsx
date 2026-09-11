import { ChoiceDropdown } from '../ui/choice-dropdown';
import { FilterChip } from '../ui/filter-chip';
import { Input } from '../ui/form-field';
import { SearchForm } from '../ui/search-form';

type FilterOption<Value extends string> = { label: string; value?: Value };

type LearningListToolbarProps<Status extends string> = {
  genre: string;
  levels: string[];
  onGenreChange: (value: string) => void;
  onGenreSubmit: () => void;
  onLevelsChange: (value: string[]) => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onStatusChange: (value?: Status) => void;
  query: string;
  status?: Status;
  statuses: Array<FilterOption<Status>>;
};

export const LearningListToolbar = <Status extends string>({
  genre,
  levels,
  onGenreChange,
  onGenreSubmit,
  onLevelsChange,
  onQueryChange,
  onSearch,
  onStatusChange,
  query,
  status,
  statuses,
}: LearningListToolbarProps<Status>) => (
  <div className='space-y-4'>
    <SearchForm
      label='Cari materi'
      onChange={onQueryChange}
      onSearch={onSearch}
      placeholder='Cari topik, genre, tag, atau kode...'
      value={query}
    />
    <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
      <fieldset className='flex flex-wrap gap-2'>
        <legend className='sr-only'>Filter status</legend>
        {statuses.map((option) => (
          <FilterChip key={option.label} active={status === option.value} onClick={() => onStatusChange(option.value)}>
            {option.label}
          </FilterChip>
        ))}
      </fieldset>
      <span className='hidden h-8 w-px bg-border lg:block' aria-hidden='true' />
      <ChoiceDropdown
        className='w-full lg:w-72 lg:shrink-0'
        label='Filter level'
        mode='multiple'
        onChange={onLevelsChange}
        options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((option) => ({ label: option, value: option }))}
        placeholder='Semua level'
        searchPlaceholder='Cari level...'
        value={levels}
      />
      <Input
        aria-label='Filter genre'
        className='min-w-48 lg:w-auto'
        placeholder='Semua genre'
        value={genre}
        onChange={(event) => onGenreChange(event.target.value)}
        onBlur={onGenreSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onGenreSubmit();
        }}
      />
    </div>
  </div>
);
