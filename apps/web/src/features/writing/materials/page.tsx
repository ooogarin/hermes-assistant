import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { Field, TextField } from '../../../components/ui/form-field';
import { WritingList } from '../../../components/writing/writing-list';
import { WritingNavigation } from '../../../components/writing/writing-navigation';
import { WritingToolbar } from '../../../components/writing/writing-toolbar';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getAllWritingMaterials } from '../writing-api';
import type { WritingListFilters } from '../writing-api';

const statuses = ['unsubmitted', 'submitted', 'reviewed'] as const;

const WritingMaterialsPage = () => {
  const [params, setParams] = useSearchParams();
  const appliedQuery = params.get('q')?.trim() || undefined;
  const genre = params.get('genre')?.trim() || undefined;
  const levels = (params.get('levels') ?? '').split(',').filter(Boolean);
  const status = statuses.find((value) => value === params.get('status'));
  const [query, setQuery] = useState(appliedQuery ?? '');
  const [draftGenre, setDraftGenre] = useState(genre ?? '');
  const [draftLevels, setDraftLevels] = useState(levels);
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const filters: Omit<WritingListFilters, 'page' | 'limit'> = { q: appliedQuery, genre, levels, status, sort };

  useEffect(() => setQuery(appliedQuery ?? ''), [appliedQuery]);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    next.delete('page');

    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name);
      } else {
        next.set(name, value);
      }
    }

    setParams(next);
  };
  const materials = useApiQuery(params.toString(), (signal) => getAllWritingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || filters.status || levels.length || filters.genre);

  return (
    <div className='space-y-7'>
      <WritingNavigation />
      <WritingToolbar
        activeFilterCount={Number(Boolean(filters.genre)) + Number(levels.length > 0)}
        onApplyFilters={() => update({ genre: draftGenre.trim(), levels: draftLevels.join(','), level: undefined })}
        onOpenFilters={() => {
          setDraftGenre(filters.genre ?? '');
          setDraftLevels(levels);
        }}
        onQueryChange={(value) => {
          setQuery(value);

          if (value === '') {
            update({ q: undefined });
          }
        }}
        onResetFilters={() => {
          setDraftGenre('');
          setDraftLevels([]);
          update({ genre: undefined, levels: undefined, level: undefined });
        }}
        onSearch={() => update({ q: query.trim() })}
        onSortChange={() => update({ sort: sort === 'newest' ? 'oldest' : 'newest' })}
        onStatusChange={(value) => update({ status: value })}
        query={query}
        searchLabel='Cari prompt'
        sort={sort}
        status={filters.status}
        statuses={[
          { label: 'Semua' },
          { label: 'Belum ada tulisan', value: 'unsubmitted' },
          { label: 'Belum dianalisis', value: 'submitted' },
          { label: 'Ada analisis', value: 'reviewed' },
        ]}
      >
        <Field label='Level'>
          <ChoiceDropdown
            label='Filter level'
            mode='multiple'
            onChange={setDraftLevels}
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
              <Button variant='secondary' onClick={() => setParams(new URLSearchParams())}>
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
