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
import { useListParams } from '../../../lib/hooks/use-list-params';
import { cefrLevels } from '../../../lib/levels';
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
  const list = useListParams({
    deferred: ['levels', 'genre'],
    fields: {
      genre: { param: 'genre' },
      levels: { param: 'levels' },
      reading_status: { param: 'reading_status', values: readingStatuses },
    },
    quick: 'reading_status',
  });
  const filters: ReadingListFilters = {
    genre: list.filters.genre,
    levels: list.filters.levels?.split(',').filter(Boolean),
    limit: 100,
    q: list.filters.q,
    reading_status: list.filters.reading_status,
    sort: list.filters.sort,
  };
  const [open, setOpen] = useState(false);
  const materials = useApiQuery(list.key, (signal) => getReadingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || list.activeFilterCount > 0);
  const draftLevels = list.drafts.levels.split(',').filter(Boolean);

  return (
    <div className='space-y-7'>
      <PageHeader title='Reading' actions={<EnglishSettingsLink to='/english/reading/settings' />} />
      <div className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
          <SearchForm
            label='Cari bacaan'
            placeholder='Cari bacaan...'
            value={list.query}
            onChange={(value) => {
              list.setQuery(value);

              if (!value) list.setParam('q', undefined);
            }}
            onSearch={list.applyQuery}
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
                onChange={(value) => list.setDraft('levels', value.join(','))}
                options={cefrLevels.map((value) => ({ value, label: value }))}
              />
              <TextField
                label='Genre'
                placeholder='Semua genre'
                value={list.drafts.genre}
                onChange={(event) => list.setDraft('genre', event.target.value)}
              />
              <div className='flex justify-between gap-3'>
                <Button
                  variant='secondary'
                  onClick={() => {
                    list.setDraft('genre', '');
                    list.setDraft('levels', '');
                    list.applyFilters();
                    setOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    list.applyFilters();
                    setOpen(false);
                  }}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </FilterPopover>
          <SortToggle className='h-12 lg:shrink-0' onToggle={list.toggleSort} sort={list.sort} />
        </div>
        <FilterChipRow
          label='Status baca'
          onChange={(value) => list.setQuick(value)}
          options={readingStatusOptions}
          value={list.filters.reading_status}
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
                <Button variant='secondary' onClick={list.clearFilters}>
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
