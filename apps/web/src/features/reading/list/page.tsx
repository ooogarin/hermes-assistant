import { useState } from 'react';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { ReadingList } from '../../../components/reading/reading-list';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { FilterChipRow } from '../../../components/ui/filter-chip-row';
import { FilterPopover } from '../../../components/ui/filter-popover';
import { TextField } from '../../../components/ui/form-field';
import { SearchForm } from '../../../components/ui/search-form';
import { SortToggle } from '../../../components/ui/sort-toggle';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useDraftValue } from '../../../lib/hooks/use-draft-value';
import { useLearningListParams } from '../../../lib/hooks/use-learning-list-params';
import { getReadingMaterials } from '../reading-api';
import type { FilterChipOption } from '../../../components/ui/filter-chip-row';
import type { ReadingListFilters } from '../reading-api';

const readingStatuses = ['read', 'unread'] as const;
const readingStatusOptions: Array<FilterChipOption<(typeof readingStatuses)[number]>> = [
  { label: 'Semua' },
  { label: 'Belum dibaca', value: 'unread' },
  { label: 'Sudah dibaca', value: 'read' },
];

const ReadingListPage = () => {
  const {
    clearParams,
    key,
    query: appliedQuery,
    searchParams,
    setParams,
    setStatus,
    sort,
    status,
  } = useLearningListParams({ statusParam: 'reading_status', statuses: readingStatuses });
  const levelsKey = searchParams.get('levels') ?? '';
  const filters: ReadingListFilters = {
    q: appliedQuery,
    reading_status: status,
    levels: levelsKey.split(',').filter(Boolean),
    genre: searchParams.get('genre')?.trim() || undefined,
    limit: 100,
    sort,
  };
  const [query, setQuery] = useDraftValue(appliedQuery ?? '');
  const [draftLevelsKey, setDraftLevelsKey] = useDraftValue(levelsKey);
  const [draftGenre, setDraftGenre] = useDraftValue(filters.genre ?? '');
  const [open, setOpen] = useState(false);
  const materials = useApiQuery(key, (signal) => getReadingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || filters.reading_status || filters.levels?.length || filters.genre);
  const draftLevels = draftLevelsKey.split(',').filter(Boolean);

  return (
    <div className='space-y-7'>
      <PageHeader title='Reading' actions={<EnglishSettingsLink to='/english/reading/settings' />} />
      <div className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
          <SearchForm
            label='Cari bacaan'
            placeholder='Cari bacaan...'
            value={query}
            onChange={(value) => {
              setQuery(value);
              if (!value) setParams({ q: undefined });
            }}
            onSearch={() => setParams({ q: query.trim() || undefined })}
          />
          <FilterPopover
            activeCount={Number(Boolean(filters.genre)) + (filters.levels?.length ?? 0)}
            id='reading-filters'
            label='Filter Reading'
            open={open}
            onToggle={() => setOpen(!open)}
            onClose={() => setOpen(false)}
          >
            <div className='space-y-4'>
              <ChoiceDropdown
                mode='multiple'
                label='Filter level'
                placeholder='Semua level'
                value={draftLevels}
                onChange={(value) => setDraftLevelsKey(value.join(','))}
                options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({ value, label: value }))}
              />
              <TextField
                label='Genre'
                placeholder='Semua genre'
                value={draftGenre}
                onChange={(event) => setDraftGenre(event.target.value)}
              />
              <div className='flex justify-between gap-3'>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setDraftGenre('');
                    setDraftLevelsKey('');
                    setParams({ genre: undefined, levels: undefined });
                    setOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    setParams({ genre: draftGenre.trim() || undefined, levels: draftLevelsKey });
                    setOpen(false);
                  }}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </FilterPopover>
          <SortToggle
            className='h-12 lg:shrink-0'
            onToggle={() => setParams({ sort: sort === 'oldest' ? 'newest' : 'oldest' })}
            sort={sort}
          />
        </div>
        <FilterChipRow
          label='Status baca'
          onChange={(value) => setStatus(value)}
          options={readingStatusOptions}
          value={status}
        />
      </div>
      {materials.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {materials.status === 'error' ? <ErrorState onRetry={materials.retry} /> : null}
      {materials.status === 'success' ? (
        materials.data.items.length ? (
          <ReadingList items={materials.data.items} />
        ) : (
          <ContentState
            title={hasFilters ? 'Tidak ada bacaan yang cocok' : 'Belum ada bacaan'}
            description={
              hasFilters ? 'Coba pencarian atau filter lain.' : 'Bacaan yang dibuat melalui Hermes akan muncul di sini.'
            }
            action={
              hasFilters ? (
                <Button variant='secondary' onClick={clearParams}>
                  Hapus filter
                </Button>
              ) : undefined
            }
          />
        )
      ) : null}
    </div>
  );
};
export default ReadingListPage;
