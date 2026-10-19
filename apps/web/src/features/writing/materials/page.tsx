import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { Field, TextField } from '../../../components/ui/form-field';
import { WritingList } from '../../../components/writing/writing-list';
import { WritingNavigation } from '../../../components/writing/writing-navigation';
import { WritingToolbar } from '../../../components/writing/writing-toolbar';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useListParams } from '../../../lib/hooks/use-list-params';
import { cefrLevels } from '../../../lib/levels';
import { getAllWritingMaterials } from '../writing-api';
import type { WritingListFilters } from '../writing-api';

const statuses = ['unsubmitted', 'submitted', 'reviewed'] as const;
const statusOptions = [
  { label: 'Semua' },
  { label: 'Belum ada tulisan', value: 'unsubmitted' },
  { label: 'Belum dianalisis', value: 'submitted' },
  { label: 'Ada analisis', value: 'reviewed' },
] as const;

const WritingMaterialsPage = () => {
  const list = useListParams({
    deferred: ['genre', 'levels'],
    fields: {
      genre: { param: 'genre' },
      levels: { param: 'levels' },
      status: { param: 'status', values: statuses },
    },
    quick: 'status',
  });
  const filters: Omit<WritingListFilters, 'page' | 'limit'> = {
    genre: list.filters.genre,
    levels: list.filters.levels?.split(',').filter(Boolean),
    q: list.filters.q,
    sort: list.filters.sort,
    status: list.filters.status,
  };
  const materials = useApiQuery(list.key, (signal) => getAllWritingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || list.activeFilterCount > 0);
  const draftLevels = list.drafts.levels.split(',').filter(Boolean);

  return (
    <div className='space-y-7'>
      <WritingNavigation />
      <WritingToolbar
        activeFilterCount={Number(Boolean(filters.genre)) + Number((filters.levels?.length ?? 0) > 0)}
        onApplyFilters={list.applyFilters}
        onOpenFilters={list.resetFilters}
        onQueryChange={(value) => {
          list.setQuery(value);

          if (value === '') {
            list.setParam('q', undefined);
          }
        }}
        onResetFilters={() => {
          list.setDraft('genre', '');
          list.setDraft('levels', '');
          list.applyFilters();
        }}
        onSearch={list.applyQuery}
        onSortChange={list.toggleSort}
        onStatusChange={(value) => list.setQuick(value)}
        query={list.query}
        searchLabel='Cari prompt'
        sort={list.sort}
        status={list.filters.status}
        statuses={[...statusOptions]}
      >
        <Field label='Level'>
          <ChoiceDropdown
            label='Filter level'
            mode='multiple'
            onChange={(value) => list.setDraft('levels', value.join(','))}
            options={cefrLevels.map((value) => ({ label: value, value }))}
            placeholder='Semua level'
            searchable={false}
            value={draftLevels}
          />
        </Field>
        <TextField
          label='Genre'
          maxLength={100}
          onChange={(event) => list.setDraft('genre', event.target.value)}
          placeholder='Semua genre'
          value={list.drafts.genre}
        />
      </WritingToolbar>

      {materials.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {materials.status === 'error' ? <ErrorState onRetry={materials.retry} /> : null}
      {materials.status === 'success' && materials.data.length === 0 ? (
        <ContentState
          title={hasFilters ? 'Tidak ada prompt yang cocok' : 'Belum ada prompt Writing'}
          description={
            hasFilters
              ? 'Coba gunakan pencarian atau filter lain.'
              : 'Prompt yang dibuat melalui Hermes akan muncul di sini.'
          }
          action={
            hasFilters ? (
              <Button variant='secondary' onClick={list.clearFilters}>
                Hapus filter
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {materials.status === 'success' && materials.data.length > 0 ? <WritingList items={materials.data} /> : null}
    </div>
  );
};

export default WritingMaterialsPage;
