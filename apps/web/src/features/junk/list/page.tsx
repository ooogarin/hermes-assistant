import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { JunkActions } from '../../../components/junk/junk-actions';
import { JunkDetailPane } from '../../../components/junk/junk-detail-pane';
import { JunkList } from '../../../components/junk/junk-list';
import { JunkToolbar } from '../../../components/junk/junk-toolbar';
import { PageHeader } from '../../../components/layout/page-header';
import { Button } from '../../../components/ui/button';
import { ButtonLink } from '../../../components/ui/button-link';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { optionalValue, usePersonalContentList } from '../../../lib/hooks/use-personal-content-list';
import { getJunkItem, getJunkItems } from '../junk-api';

const JunkListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const list = usePersonalContentList<string | undefined>({
    basePath: '/junk',
    emptyExtra: undefined,
    readExtra: (params) => optionalValue(params.get('source_url') ?? params.get('sourceUrl')),
    writeExtra: (sourceUrl) => ({ source_url: optionalValue(sourceUrl) }),
  });
  const items = useApiQuery(list.listKey, (signal) => getJunkItems({ ...list.filters, sourceUrl: list.extra }, signal));
  const detail = useApiQuery(list.previewCode ?? 'no-selected-junk', (signal) =>
    list.previewCode === undefined ? Promise.resolve(null) : getJunkItem(list.previewCode, signal),
  );
  const selectedCode = list.previewCode;
  const dateRangeInvalid = Boolean(list.drafts.from && list.drafts.to && list.drafts.from > list.drafts.to);

  const applyQuickCategory = (nextCategory?: string) => {
    list.setDraft('category', nextCategory ?? '');
    list.updateFilters({ ...list.filters, category: nextCategory }, list.extra);
  };

  return (
    <div className='space-y-7'>
      <NavigationNotice />
      <PageHeader
        actions={<ButtonLink icon={<Plus aria-hidden='true' size={18} />} label='Tambah Junk' to='/junk/new' />}
        title='Junk'
      />
      <JunkToolbar
        activeCategory={list.filters.category}
        activeFilterCount={list.activeFilterCount}
        category={list.drafts.category}
        dateRangeInvalid={dateRangeInvalid}
        from={list.drafts.from}
        to={list.drafts.to}
        source={list.drafts.source}
        sort={list.filters.sort ?? 'newest'}
        filtersOpen={filtersOpen}
        onApply={list.applyFilters}
        onCategoryChange={(value) => list.setDraft('category', value)}
        onFromChange={(value) => list.setDraft('from', value)}
        onToChange={(value) => list.setDraft('to', value)}
        onSourceChange={(value) => list.setDraft('source', value)}
        onSortChange={list.toggleSort}
        onCloseFilters={() => setFiltersOpen(false)}
        onQueryChange={(value) => list.setDraft('q', value)}
        onQuickCategoryChange={applyQuickCategory}
        onReset={list.resetAdvancedFilters}
        onSearch={list.applySearch}
        onSourceUrlChange={(value) => list.setExtraDraft(value)}
        onTagChange={(value) => list.setDraft('tag', value)}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        query={list.drafts.q}
        sourceUrl={list.extraDraft ?? ''}
        tag={list.drafts.tag}
      />

      <div
        className={
          selectedCode === undefined
            ? undefined
            : 'grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.65fr)]'
        }
      >
        <div className={selectedCode === undefined ? 'min-w-0' : 'min-w-0 max-xl:hidden'}>
          {items.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
          {items.status === 'error' ? <ErrorState onRetry={items.retry} /> : null}
          {items.status === 'success' && items.data.length === 0 ? (
            <ContentState
              title={list.hasActiveQuery ? 'Tidak ada Junk yang cocok' : 'Belum ada Junk'}
              description={
                list.hasActiveQuery
                  ? 'Coba gunakan kata kunci atau filter lain.'
                  : 'Temuan yang disimpan melalui Hermes akan muncul di sini.'
              }
              action={
                list.hasActiveQuery ? (
                  <Button variant='secondary' onClick={list.clearFilters}>
                    Hapus pencarian
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {items.status === 'success' && items.data.length > 0 ? (
            <JunkList items={items.data} selectedCode={selectedCode} toDetail={list.previewUrl} />
          ) : null}
        </div>

        {selectedCode !== undefined ? (
          <div className='min-w-0 max-xl:col-span-full'>
            {detail.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
            {detail.status === 'error' ? (
              detail.error instanceof ApiError && detail.error.status === 404 ? (
                <ContentState
                  title='Junk tidak ditemukan'
                  description='Item ini mungkin sudah tidak tersedia.'
                  action={
                    <Button variant='secondary' onClick={list.closePreview}>
                      Kembali ke Junk
                    </Button>
                  }
                />
              ) : (
                <ErrorState onRetry={detail.retry} />
              )
            ) : null}
            {detail.status === 'success' && detail.data !== null ? (
              <JunkDetailPane
                key={selectedCode}
                actions={
                  <JunkActions
                    key={selectedCode}
                    item={detail.data}
                    onDeleted={() => {
                      list.closePreview();
                      items.retry();
                    }}
                  />
                }
                item={detail.data}
                onClose={list.closePreview}
                onOpenPage={() =>
                  navigate(`/junk/${selectedCode}`, { state: { returnTo: location.pathname + location.search } })
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JunkListPage;
