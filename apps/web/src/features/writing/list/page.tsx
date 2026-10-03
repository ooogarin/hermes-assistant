import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { Button } from '../../../components/ui/button';
import { ButtonLink } from '../../../components/ui/button-link';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { Field } from '../../../components/ui/form-field';
import { WritingNavigation } from '../../../components/writing/writing-navigation';
import { WritingSubmissionList } from '../../../components/writing/writing-submission-list';
import { WritingToolbar } from '../../../components/writing/writing-toolbar';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getAllWritingSubmissions } from '../writing-api';
import type { WritingSubmissionFilters } from '../writing-api';

const statuses = ['not_analyzed', 'analyzed'] as const;
const writingTypes = ['free', 'prompted'] as const;
const statusOptions = [
  { label: 'Semua', value: undefined },
  { label: 'Belum dianalisis', value: 'not_analyzed' },
  { label: 'Sudah dianalisis', value: 'analyzed' },
] as const;

const WritingListPage = () => {
  const [params, setParams] = useSearchParams();
  const appliedQuery = params.get('q')?.trim() || undefined;
  const [query, setQuery] = useState(appliedQuery ?? '');
  const analysisStatus = statuses.find((status) => status === params.get('analysis_status'));
  const writingType = writingTypes.find((type) => type === params.get('writing_type'));
  const [draftWritingType, setDraftWritingType] = useState<WritingSubmissionFilters['writingType']>(writingType);
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const submissions = useApiQuery(params.toString(), (signal) =>
    getAllWritingSubmissions({ q: appliedQuery, analysisStatus, writingType, sort }, signal),
  );
  const hasFilters = Boolean(appliedQuery || analysisStatus || writingType);

  useEffect(() => setQuery(appliedQuery ?? ''), [appliedQuery]);

  const update = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    next.delete('page');

    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name);
      } else {
        next.set(name, String(value));
      }
    }

    setParams(next);
  };

  return (
    <div className='space-y-7'>
      <WritingNavigation />
      <WritingToolbar
        activeFilterCount={writingType === undefined ? 0 : 1}
        onApplyFilters={() => update({ writing_type: draftWritingType })}
        onOpenFilters={() => setDraftWritingType(writingType)}
        onQueryChange={(value) => {
          setQuery(value);

          if (value === '') {
            update({ q: undefined });
          }
        }}
        onResetFilters={() => {
          setDraftWritingType(undefined);
          update({ writing_type: undefined });
        }}
        onSearch={() => update({ q: query.trim() })}
        onSortChange={() => update({ sort: sort === 'newest' ? 'oldest' : 'newest' })}
        onStatusChange={(value) => update({ analysis_status: value })}
        query={query}
        searchLabel='Cari tulisan'
        sort={sort}
        status={analysisStatus}
        statuses={[...statusOptions]}
      >
        <Field label='Jenis tulisan'>
          <ChoiceDropdown
            label='Jenis tulisan'
            mode='single'
            onChange={(value) => setDraftWritingType(value ?? undefined)}
            options={[
              { label: 'Tulisan bebas', value: 'free' },
              { label: 'Dari prompt', value: 'prompted' },
            ]}
            placeholder='Semua jenis'
            searchable={false}
            value={draftWritingType ?? null}
          />
        </Field>
      </WritingToolbar>
      {submissions.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {submissions.status === 'error' ? <ErrorState onRetry={submissions.retry} /> : null}
      {submissions.status === 'success' && submissions.data.length === 0 ? (
        <ContentState
          title={hasFilters ? 'Tidak ada tulisan yang cocok' : 'Belum ada tulisan'}
          description={
            hasFilters
              ? 'Coba gunakan pencarian atau filter lain.'
              : 'Mulai menulis bebas atau pilih prompt dari Hermes.'
          }
          action={
            hasFilters ? (
              <Button variant='secondary' onClick={() => setParams(new URLSearchParams())}>
                Hapus filter
              </Button>
            ) : (
              <ButtonLink label='Tulis bebas' to='/english/writing/new' />
            )
          }
        />
      ) : null}
      {submissions.status === 'success' && submissions.data.length > 0 ? (
        <WritingSubmissionList items={submissions.data} />
      ) : null}
    </div>
  );
};

export default WritingListPage;
