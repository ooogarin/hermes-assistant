import { useState } from 'react';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ErrorState } from '../../../components/feedback/content-state';
import { ListEmptyState } from '../../../components/feedback/list-empty-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionTable } from '../../../components/grammar/grammar-session-table';
import { PageHeader } from '../../../components/layout/page-header';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { FilterChipRow } from '../../../components/ui/filter-chip-row';
import { FilterPopover } from '../../../components/ui/filter-popover';
import { SearchForm } from '../../../components/ui/search-form';
import { SortToggle } from '../../../components/ui/sort-toggle';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useListParams } from '../../../lib/hooks/use-list-params';
import { cefrLevels } from '../../../lib/levels';
import { getGrammarSessions } from '../grammar-api';
import type { FilterChipOption } from '../../../components/ui/filter-chip-row';
import type { GrammarSessionListFilters } from '../grammar-api';

const sessionStatuses = ['active', 'completed'] as const;
const sessionStatusOptions: Array<FilterChipOption<(typeof sessionStatuses)[number]>> = [
  { label: 'Semua' },
  { label: 'Aktif', value: 'active' },
  { label: 'Selesai', value: 'completed' },
];
const sessionModes = ['practice', 'exam'] as const;
const sessionListLimit = 100;

const GrammarListPage = () => {
  const list = useListParams({
    deferred: ['mode', 'level'],
    fields: {
      level: { param: 'level', values: cefrLevels },
      mode: { param: 'mode', values: sessionModes },
      status: { param: 'status', values: sessionStatuses },
    },
    quick: 'status',
  });
  const filters: GrammarSessionListFilters = {
    level: list.filters.level,
    limit: sessionListLimit,
    mode: list.filters.mode,
    q: list.filters.q,
    sort: list.filters.sort,
    status: list.filters.status,
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sessions = useApiQuery(list.key, (signal) => getGrammarSessions(filters, signal));
  const hasFilters = Boolean(list.filters.q || list.activeFilterCount > 0);

  return (
    <div className='space-y-7'>
      <PageHeader actions={<EnglishSettingsLink to='/english/grammar/settings' />} title='Grammar' />
      <div className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
          <SearchForm
            label='Cari sesi'
            placeholder='Cari kode sesi...'
            value={list.query}
            onChange={(value) => {
              list.setQuery(value);

              if (!value) list.setParam('q', undefined);
            }}
            onSearch={list.applyQuery}
          />
          <FilterPopover
            activeCount={Number(Boolean(list.filters.mode)) + Number(Boolean(list.filters.level))}
            id='grammar-filters'
            label='Filter Grammar'
            open={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
            onClose={() => setFiltersOpen(false)}
          >
            <div className='space-y-4'>
              <ChoiceDropdown
                label='Filter mode'
                mode='single'
                onChange={(value) => list.setDraft('mode', value ?? '')}
                options={[
                  { label: 'Practice', value: 'practice' },
                  { label: 'Exam', value: 'exam' },
                ]}
                placeholder='Semua mode'
                searchable={false}
                value={list.drafts.mode || null}
              />
              <ChoiceDropdown
                label='Filter level'
                mode='single'
                onChange={(value) => list.setDraft('level', value ?? '')}
                options={cefrLevels.map((level) => ({ label: level, value: level }))}
                placeholder='Semua level'
                searchable={false}
                value={list.drafts.level || null}
              />
              <div className='flex justify-between gap-3'>
                <Button
                  variant='secondary'
                  onClick={() => {
                    list.setDraft('mode', '');
                    list.setDraft('level', '');
                    list.applyFilters();
                    setFiltersOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    list.applyFilters();
                    setFiltersOpen(false);
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
          label='Status sesi'
          onChange={(value) => list.setQuick(value)}
          options={sessionStatusOptions}
          value={list.filters.status}
        />
      </div>
      {sessions.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {sessions.status === 'error' ? <ErrorState onRetry={sessions.retry} /> : null}
      {sessions.status === 'success' ? (
        sessions.data.items.length ? (
          <GrammarSessionTable items={sessions.data.items} />
        ) : (
          <ListEmptyState
            description='Sesi dari latihan harian atau permintaan lewat Hermes akan muncul di sini.'
            filteredDescription='Coba pencarian atau filter lain.'
            filteredTitle='Tidak ada sesi yang cocok'
            hasFilters={hasFilters}
            onClearFilters={list.clearFilters}
            title='Belum ada sesi Grammar'
          />
        )
      ) : null}
    </div>
  );
};

export default GrammarListPage;
