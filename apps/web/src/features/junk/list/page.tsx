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
import { optionalValue, useListParams } from '../../../lib/hooks/use-list-params';
import { getJunkItem, getJunkItems } from '../junk-api';

const JunkListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const list = useListParams({
    deferred: ['source_url', 'category', 'tag', 'source', 'from', 'to'],
    fields: {
      category: { param: 'category' },
      from: { param: 'from' },
      source: { param: 'source' },
      source_url: { alias: 'sourceUrl', param: 'source_url' },
      tag: { param: 'tag' },
      to: { param: 'to' },
    },
    quick: 'category',
  });
  const selectedCode = optionalValue(list.searchParams.get('preview'));
  const items = useApiQuery(list.key, (signal) =>
    getJunkItems(
      {
        category: list.filters.category,
        from: list.filters.from,
        q: list.filters.q,
        sort: list.filters.sort,
        source: list.filters.source,
        sourceUrl: list.filters.source_url,
        tag: list.filters.tag,
        to: list.filters.to,
      },
      signal,
    ),
  );
  const detail = useApiQuery(selectedCode ?? 'no-selected-junk', (signal) =>
    selectedCode === undefined ? Promise.resolve(null) : getJunkItem(selectedCode, signal),
  );
  const dateRangeInvalid = Boolean(list.drafts.from && list.drafts.to && list.drafts.from > list.drafts.to);
  const closePreview = () => list.setParam('preview', undefined);
  const previewUrl = (code: string) => {
    const params = new URLSearchParams(list.searchParams);

    params.set('preview', code);

    return `/junk?${params.toString()}`;
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
        sort={list.filters.sort}
        filtersOpen={filtersOpen}
        onApply={list.applyFilters}
        onCategoryChange={(value) => list.setDraft('category', value)}
        onFromChange={(value) => list.setDraft('from', value)}
        onToChange={(value) => list.setDraft('to', value)}
        onSourceChange={(value) => list.setDraft('source', value)}
        onSortChange={list.toggleSort}
        onCloseFilters={() => setFiltersOpen(false)}
        onQueryChange={(value) => list.setQuery(value)}
        onQuickCategoryChange={(value) => list.setQuick(value)}
        onReset={list.resetFilters}
        onSearch={list.applyQuery}
        onSourceUrlChange={(value) => list.setDraft('source_url', value)}
        onTagChange={(value) => list.setDraft('tag', value)}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        query={list.query}
        sourceUrl={list.drafts.source_url}
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
              title={list.activeFilterCount > 0 || list.filters.q ? 'Tidak ada Junk yang cocok' : 'Belum ada Junk'}
              description={
                list.activeFilterCount > 0 || list.filters.q
                  ? 'Coba gunakan kata kunci atau filter lain.'
                  : 'Temuan yang disimpan melalui Hermes akan muncul di sini.'
              }
              action={
                list.activeFilterCount > 0 || list.filters.q ? (
                  <Button variant='secondary' onClick={list.clearFilters}>
                    Hapus pencarian
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {items.status === 'success' && items.data.length > 0 ? (
            <JunkList items={items.data} selectedCode={selectedCode} toDetail={previewUrl} />
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
                    <Button variant='secondary' onClick={closePreview}>
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
                      closePreview();
                      items.retry();
                    }}
                  />
                }
                item={detail.data}
                onClose={closePreview}
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
