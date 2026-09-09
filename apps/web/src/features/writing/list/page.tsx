import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { LearningListToolbar } from '../../../components/english/learning-list-toolbar';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { Button } from '../../../components/ui/button';
import { CollectionPagination } from '../../../components/ui/collection-pagination';
import { WritingList } from '../../../components/writing/writing-list';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useLearningListParams } from '../../../lib/hooks/use-learning-list-params';
import { getWritingMaterials } from '../writing-api';

const statuses = ['unsubmitted', 'reviewed'] as const;

const WritingListPage = () => {
  const state = useLearningListParams(statuses);
  const filters = { ...state.filters, limit: 20, sort: 'newest' as const };
  const materials = useApiQuery(state.key, (signal) => getWritingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || filters.status || filters.levels.length || filters.genre);

  return (
    <div className='space-y-7'>
      <PageHeader
        title='Writing'
        description='Latihan menulis dengan feedback terarah.'
        actions={<EnglishSettingsLink to='/english/writing/settings' />}
      />
      <LearningListToolbar
        genre={state.genre}
        levels={filters.levels}
        onGenreChange={state.setGenre}
        onGenreSubmit={state.submitGenre}
        onLevelsChange={state.setLevels}
        onQueryChange={state.setQuery}
        onSearch={state.submitQuery}
        onStatusChange={state.setStatus}
        query={state.query}
        status={filters.status}
        statuses={[
          { label: 'Semua' },
          { label: 'Belum dikumpulkan', value: 'unsubmitted' },
          { label: 'Sudah dinilai', value: 'reviewed' },
        ]}
      />

      {materials.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {materials.status === 'error' ? <ErrorState onRetry={materials.retry} /> : null}
      {materials.status === 'success' && materials.data.items.length === 0 ? (
        <ContentState
          title={hasFilters ? 'Tidak ada prompt yang cocok' : 'Belum ada prompt Writing'}
          description={
            hasFilters
              ? 'Coba gunakan pencarian atau filter lain.'
              : 'Prompt yang dibuat melalui Hermes akan muncul di sini.'
          }
          action={
            hasFilters ? (
              <Button variant='secondary' onClick={state.clearFilters}>
                Hapus filter
              </Button>
            ) : undefined
          }
        />
      ) : null}
      {materials.status === 'success' && materials.data.items.length > 0 ? (
        <>
          <WritingList items={materials.data.items} />
          <CollectionPagination
            itemCount={materials.data.items.length}
            limit={materials.data.meta.limit}
            onPageChange={state.setPage}
            page={materials.data.meta.page}
            total={materials.data.meta.total}
            totalPages={materials.data.meta.totalPages}
          />
        </>
      ) : null}
    </div>
  );
};

export default WritingListPage;
