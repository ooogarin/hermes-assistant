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
import { useListParams } from '../../../lib/hooks/use-list-params';
import { getAllWritingSubmissions } from '../writing-api';

const statuses = ['not_analyzed', 'analyzed'] as const;
const writingTypes = ['free', 'prompted'] as const;
const statusOptions = [
  { label: 'Semua', value: undefined },
  { label: 'Belum dianalisis', value: 'not_analyzed' },
  { label: 'Sudah dianalisis', value: 'analyzed' },
] as const;

const WritingListPage = () => {
  const list = useListParams({
    deferred: ['writing_type'],
    fields: {
      analysis_status: { param: 'analysis_status', values: statuses },
      writing_type: { param: 'writing_type', values: writingTypes },
    },
    quick: 'analysis_status',
  });
  const submissions = useApiQuery(list.key, (signal) =>
    getAllWritingSubmissions(
      {
        analysisStatus: list.filters.analysis_status,
        q: list.filters.q,
        sort: list.filters.sort,
        writingType: list.filters.writing_type,
      },
      signal,
    ),
  );
  const hasFilters = Boolean(list.filters.q || list.activeFilterCount > 0);

  return (
    <div className='space-y-7'>
      <WritingNavigation />
      <WritingToolbar
        activeFilterCount={list.filters.writing_type === undefined ? 0 : 1}
        onApplyFilters={list.applyFilters}
        onOpenFilters={list.resetFilters}
        onQueryChange={(value) => {
          list.setQuery(value);

          if (value === '') {
            list.setParam('q', undefined);
          }
        }}
        onResetFilters={() => {
          list.setDraft('writing_type', '');
          list.applyFilters();
        }}
        onSearch={list.applyQuery}
        onSortChange={list.toggleSort}
        onStatusChange={(value) => list.setQuick(value)}
        query={list.query}
        searchLabel='Cari tulisan'
        sort={list.sort}
        status={list.filters.analysis_status}
        statuses={[...statusOptions]}
      >
        <Field label='Jenis tulisan'>
          <ChoiceDropdown
            label='Jenis tulisan'
            mode='single'
            onChange={(value) => list.setDraft('writing_type', value ?? '')}
            options={[
              { label: 'Tulisan bebas', value: 'free' },
              { label: 'Dari prompt', value: 'prompted' },
            ]}
            placeholder='Semua jenis'
            searchable={false}
            value={list.drafts.writing_type || null}
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
              <Button variant='secondary' onClick={list.clearFilters}>
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
