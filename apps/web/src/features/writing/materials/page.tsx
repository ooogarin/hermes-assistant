import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { Field, TextField } from '../../../components/ui/form-field';
import { WritingList } from '../../../components/writing/writing-list';
import { WritingNavigation } from '../../../components/writing/writing-navigation';
import { WritingToolbar } from '../../../components/writing/writing-toolbar';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useDraftValue } from '../../../lib/hooks/use-draft-value';
import { useLearningListParams } from '../../../lib/hooks/use-learning-list-params';
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
  const {
    clearParams,
    key,
    query: appliedQuery,
    searchParams,
    setParams,
    setStatus,
    sort,
    status,
  } = useLearningListParams({ statusParam: 'status', statuses });
  const genre = searchParams.get('genre')?.trim() || undefined;
  const levelsKey = searchParams.get('levels') ?? '';
  const levels = levelsKey.split(',').filter(Boolean);
  const filters: Omit<WritingListFilters, 'page' | 'limit'> = { q: appliedQuery, genre, levels, status, sort };
  const [query, setQuery] = useDraftValue(appliedQuery ?? '');
  const [draftGenre, setDraftGenre] = useDraftValue(genre ?? '');
  const [draftLevelsKey, setDraftLevelsKey] = useDraftValue(levelsKey);
  const materials = useApiQuery(key, (signal) => getAllWritingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || filters.status || levels.length || filters.genre);
  const draftLevels = draftLevelsKey.split(',').filter(Boolean);

  return (
    <div className='space-y-7'>
      <WritingNavigation />
      <WritingToolbar
        activeFilterCount={Number(Boolean(filters.genre)) + Number(levels.length > 0)}
        onApplyFilters={() => setParams({ genre: draftGenre.trim(), levels: draftLevelsKey, level: undefined })}
        onOpenFilters={() => {
          setDraftGenre(genre ?? '');
          setDraftLevelsKey(levelsKey);
        }}
        onQueryChange={(value) => {
          setQuery(value);

          if (value === '') {
            setParams({ q: undefined });
          }
        }}
        onResetFilters={() => {
          setDraftGenre('');
          setDraftLevelsKey('');
          setParams({ genre: undefined, levels: undefined, level: undefined });
        }}
        onSearch={() => setParams({ q: query.trim() })}
        onSortChange={() => setParams({ sort: sort === 'newest' ? 'oldest' : 'newest' })}
        onStatusChange={(value) => setStatus(value)}
        query={query}
        searchLabel='Cari prompt'
        sort={sort}
        status={status}
        statuses={[...statusOptions]}
      >
        <Field label='Level'>
          <ChoiceDropdown
            label='Filter level'
            mode='multiple'
            onChange={(value) => setDraftLevelsKey(value.join(','))}
            options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({ label: value, value }))}
            placeholder='Semua level'
            searchable={false}
            value={draftLevels}
          />
        </Field>
        <TextField
          label='Genre'
          maxLength={100}
          onChange={(event) => setDraftGenre(event.target.value)}
          placeholder='Semua genre'
          value={draftGenre}
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
              <Button variant='secondary' onClick={clearParams}>
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
