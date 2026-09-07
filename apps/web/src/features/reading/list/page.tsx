import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LearningListToolbar } from '../../../components/english/learning-list-toolbar';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { ReadingList } from '../../../components/reading/reading-list';
import { Button } from '../../../components/ui/button';
import { CollectionPagination } from '../../../components/ui/collection-pagination';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useLearningListParams } from '../../../lib/hooks/use-learning-list-params';
import { getReadingMaterials } from '../reading-api';

const statuses = ['unanswered', 'completed'] as const;

const ReadingListPage = () => {
  const state = useLearningListParams(statuses);
  const filters = { ...state.filters, limit: 20, sort: 'newest' as const };
  const materials = useApiQuery(state.key, (signal) => getReadingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || filters.status || filters.level || filters.genre);

  return (
    <div className='space-y-7'>
      <PageHeader
        title='Reading'
        description='Latihan pemahaman bacaan.'
        actions={
          <Link
            className='inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline'
            to='settings'
          >
            <Settings aria-hidden='true' size={18} />
            Pengaturan
          </Link>
        }
      />
      <LearningListToolbar
        genre={state.genre}
        level={filters.level ?? ''}
        onGenreChange={state.setGenre}
        onGenreSubmit={state.submitGenre}
        onLevelChange={state.setLevel}
        onQueryChange={state.setQuery}
        onSearch={state.submitQuery}
        onStatusChange={state.setStatus}
        query={state.query}
        status={filters.status}
        statuses={[
          { label: 'Semua' },
          { label: 'Belum dijawab', value: 'unanswered' },
          { label: 'Selesai', value: 'completed' },
        ]}
      />

      {materials.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {materials.status === 'error' ? <ErrorState onRetry={materials.retry} /> : null}
      {materials.status === 'success' && materials.data.items.length === 0 ? (
        <ContentState
          title={hasFilters ? 'Tidak ada materi yang cocok' : 'Belum ada materi Reading'}
          description={
            hasFilters
              ? 'Coba gunakan pencarian atau filter lain.'
              : 'Materi yang dibuat melalui Hermes akan muncul di sini.'
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
          <ReadingList items={materials.data.items} />
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

export default ReadingListPage;
