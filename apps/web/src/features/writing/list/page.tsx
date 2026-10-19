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
import { useDraftValue } from '../../../lib/hooks/use-draft-value';
import { useLearningListParams } from '../../../lib/hooks/use-learning-list-params';
import { getAllWritingSubmissions } from '../writing-api';

const statuses = ['not_analyzed', 'analyzed'] as const;
const writingTypes = ['free', 'prompted'] as const;
const statusOptions = [
  { label: 'Semua', value: undefined },
  { label: 'Belum dianalisis', value: 'not_analyzed' },
  { label: 'Sudah dianalisis', value: 'analyzed' },
] as const;

const WritingListPage = () => {
  const {
    clearParams,
    key,
    query: appliedQuery,
    searchParams,
    setParams,
    setStatus,
    sort,
    status,
  } = useLearningListParams({ statusParam: 'analysis_status', statuses });
  const writingType = writingTypes.find((type) => type === searchParams.get('writing_type'));
  const [query, setQuery] = useDraftValue(appliedQuery ?? '');
  const [draftWritingType, setDraftWritingType] = useDraftValue(writingType);
  const submissions = useApiQuery(key, (signal) =>
    getAllWritingSubmissions({ q: appliedQuery, analysisStatus: status, writingType, sort }, signal),
  );
  const hasFilters = Boolean(appliedQuery || status || writingType);

  return (
    <div className='space-y-7'>
      <WritingNavigation />
      <WritingToolbar
        activeFilterCount={writingType === undefined ? 0 : 1}
        onApplyFilters={() => setParams({ writing_type: draftWritingType })}
        onOpenFilters={() => setDraftWritingType(writingType)}
        onQueryChange={(value) => {
          setQuery(value);

          if (value === '') {
            setParams({ q: undefined });
          }
        }}
        onResetFilters={() => {
          setDraftWritingType(undefined);
          setParams({ writing_type: undefined });
        }}
        onSearch={() => setParams({ q: query.trim() })}
        onSortChange={() => setParams({ sort: sort === 'newest' ? 'oldest' : 'newest' })}
        onStatusChange={(value) => setStatus(value)}
        query={query}
        searchLabel='Cari tulisan'
        sort={sort}
        status={status}
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
              <Button variant='secondary' onClick={clearParams}>
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
