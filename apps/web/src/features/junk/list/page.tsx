import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import { getJunkItem, getJunkItems } from '../junk-api';
import type { JunkListFilters } from '../junk-api';

const getOptionalValue = (value: string | null): string | undefined => value?.trim() || undefined;

const toSearchParams = (filters: JunkListFilters, previewCode?: string): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.q !== undefined) params.set('q', filters.q);
  if (filters.category !== undefined) params.set('category', filters.category.toLowerCase());
  if (filters.tag !== undefined) params.set('tag', filters.tag.toLowerCase());
  if (filters.sourceUrl !== undefined) params.set('sourceUrl', filters.sourceUrl);
  if (filters.source !== undefined) params.set('source', filters.source);
  if (filters.from !== undefined) params.set('from', filters.from);
  if (filters.to !== undefined) params.set('to', filters.to);
  if (filters.sort === 'oldest') params.set('sort', 'oldest');
  if (previewCode !== undefined) params.set('preview', previewCode);
  return params;
};

const JunkListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCode = getOptionalValue(searchParams.get('preview'));
  const filters: JunkListFilters = {
    category: getOptionalValue(searchParams.get('category'))?.toLowerCase(),
    q: getOptionalValue(searchParams.get('q')),
    sourceUrl: getOptionalValue(searchParams.get('sourceUrl')),
    tag: getOptionalValue(searchParams.get('tag'))?.toLowerCase(),
    source: getOptionalValue(searchParams.get('source')),
    from: getOptionalValue(searchParams.get('from')),
    to: getOptionalValue(searchParams.get('to')),
    sort: searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest',
  };
  const listKey = toSearchParams(filters).toString();
  const items = useApiQuery(listKey, (signal) => getJunkItems(filters, signal));
  const detail = useApiQuery(selectedCode ?? 'no-selected-junk', (signal) =>
    selectedCode === undefined ? Promise.resolve(null) : getJunkItem(selectedCode, signal),
  );
  const [query, setQuery] = useState(filters.q ?? '');
  const [category, setCategory] = useState(filters.category ?? '');
  const [tag, setTag] = useState(filters.tag ?? '');
  const [sourceUrl, setSourceUrl] = useState(filters.sourceUrl ?? '');
  const [source, setSource] = useState(filters.source ?? '');
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(filters.q ?? '');
    setCategory(filters.category ?? '');
    setTag(filters.tag ?? '');
    setSourceUrl(filters.sourceUrl ?? '');
    setSource(filters.source ?? '');
    setFrom(filters.from ?? '');
    setTo(filters.to ?? '');
  }, [filters.category, filters.q, filters.sourceUrl, filters.tag, filters.source, filters.from, filters.to]);

  const updateFilters = (next: JunkListFilters) => setSearchParams(toSearchParams(next, selectedCode));
  const applySearch = () => updateFilters({ ...filters, q: getOptionalValue(query) });
  const applyFilters = () => {
    updateFilters({
      ...filters,
      category: getOptionalValue(category)?.toLowerCase(),
      sourceUrl: getOptionalValue(sourceUrl),
      tag: getOptionalValue(tag)?.toLowerCase(),
      source: getOptionalValue(source),
      from: getOptionalValue(from),
      to: getOptionalValue(to),
    });
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setTag('');
    setSourceUrl('');
    setSource('');
    setFrom('');
    setTo('');
    setSearchParams(toSearchParams({}, selectedCode));
  };
  const resetAdvancedFilters = () => {
    setCategory('');
    setTag('');
    setSourceUrl('');
    setSource('');
    setFrom('');
    setTo('');
    updateFilters({
      ...filters,
      category: undefined,
      sourceUrl: undefined,
      tag: undefined,
      source: undefined,
      from: undefined,
      to: undefined,
    });
  };
  const applyQuickCategory = (nextCategory?: string) => {
    setCategory(nextCategory?.toLowerCase() ?? '');
    updateFilters({ ...filters, category: nextCategory });
  };
  const activeFilterCount = [
    filters.category,
    filters.tag,
    filters.sourceUrl,
    filters.source,
    filters.from,
    filters.to,
  ].filter(Boolean).length;
  const hasActiveQuery = filters.q !== undefined || activeFilterCount > 0;
  const previewUrl = (code: string) => `/junk?${toSearchParams(filters, code).toString()}`;
  const closePreview = () => setSearchParams(toSearchParams(filters));

  return (
    <div className='space-y-7'>
      <NavigationNotice />
      <PageHeader
        actions={<ButtonLink icon={<Plus aria-hidden='true' size={18} />} label='Tambah Junk' to='/junk/new' />}
        title='Junk'
      />
      <JunkToolbar
        activeCategory={filters.category}
        activeFilterCount={activeFilterCount}
        category={category}
        dateRangeInvalid={Boolean(from && to && from > to)}
        from={from}
        to={to}
        source={source}
        sort={filters.sort ?? 'newest'}
        filtersOpen={filtersOpen}
        onApply={applyFilters}
        onCategoryChange={setCategory}
        onFromChange={setFrom}
        onToChange={setTo}
        onSourceChange={setSource}
        onSortChange={() => updateFilters({ ...filters, sort: filters.sort === 'oldest' ? 'newest' : 'oldest' })}
        onCloseFilters={() => setFiltersOpen(false)}
        onQueryChange={setQuery}
        onQuickCategoryChange={applyQuickCategory}
        onReset={resetAdvancedFilters}
        onSearch={applySearch}
        onSourceUrlChange={setSourceUrl}
        onTagChange={setTag}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        query={query}
        sourceUrl={sourceUrl}
        tag={tag}
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
              title={hasActiveQuery ? 'Tidak ada Junk yang cocok' : 'Belum ada Junk'}
              description={
                hasActiveQuery
                  ? 'Coba gunakan kata kunci atau filter lain.'
                  : 'Temuan yang disimpan melalui Hermes akan muncul di sini.'
              }
              action={
                hasActiveQuery ? (
                  <Button variant='secondary' onClick={clearFilters}>
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
