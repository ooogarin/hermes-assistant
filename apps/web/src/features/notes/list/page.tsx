import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { NoteActions } from '../../../components/notes/note-actions';
import { NoteDetailPane } from '../../../components/notes/note-detail-pane';
import { NoteList } from '../../../components/notes/note-list';
import { NotesToolbar } from '../../../components/notes/notes-toolbar';
import { Button } from '../../../components/ui/button';
import { ButtonLink } from '../../../components/ui/button-link';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getNote, getNotes, parseNoteType } from '../notes-api';
import type { NoteListFilters, NoteType } from '../notes-api';

const getOptionalValue = (value: string | null): string | undefined => value?.trim() || undefined;

const toSearchParams = (filters: NoteListFilters, previewCode?: string): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.q !== undefined) params.set('q', filters.q);
  if (filters.type !== undefined) params.set('type', filters.type);
  if (filters.category !== undefined) params.set('category', filters.category);
  if (filters.tag !== undefined) params.set('tag', filters.tag);
  if (filters.source !== undefined) params.set('source', filters.source);
  if (filters.from !== undefined) params.set('from', filters.from);
  if (filters.to !== undefined) params.set('to', filters.to);
  if (filters.sort === 'oldest') params.set('sort', 'oldest');
  if (previewCode !== undefined) params.set('preview', previewCode);
  return params;
};

const NotesListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCode = getOptionalValue(searchParams.get('preview'));
  const filters: NoteListFilters = {
    category: getOptionalValue(searchParams.get('category')),
    q: getOptionalValue(searchParams.get('q')),
    tag: getOptionalValue(searchParams.get('tag')),
    type: parseNoteType(searchParams.get('type')),
    source: getOptionalValue(searchParams.get('source')),
    from: getOptionalValue(searchParams.get('from')),
    to: getOptionalValue(searchParams.get('to')),
    sort: searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest',
  };
  const listKey = toSearchParams(filters).toString();
  const notes = useApiQuery(listKey, (signal) => getNotes(filters, signal));
  const detail = useApiQuery(selectedCode ?? 'no-selected-note', (signal) =>
    selectedCode === undefined ? Promise.resolve(null) : getNote(selectedCode, signal),
  );
  const [query, setQuery] = useState(filters.q ?? '');
  const [selectedType, setSelectedType] = useState<NoteType | undefined>(filters.type);
  const [category, setCategory] = useState(filters.category ?? '');
  const [tag, setTag] = useState(filters.tag ?? '');
  const [source, setSource] = useState(filters.source ?? '');
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(filters.q ?? '');
    setSelectedType(filters.type);
    setCategory(filters.category ?? '');
    setTag(filters.tag ?? '');
    setSource(filters.source ?? '');
    setFrom(filters.from ?? '');
    setTo(filters.to ?? '');
  }, [filters.category, filters.q, filters.tag, filters.type, filters.source, filters.from, filters.to]);

  const updateFilters = (next: NoteListFilters) => setSearchParams(toSearchParams(next, selectedCode));
  const applySearch = () => updateFilters({ ...filters, q: getOptionalValue(query) });
  const applyFilters = () => {
    updateFilters({
      ...filters,
      category: getOptionalValue(category),
      tag: getOptionalValue(tag),
      type: selectedType,
      source: getOptionalValue(source),
      from: getOptionalValue(from),
      to: getOptionalValue(to),
    });
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setQuery('');
    setSelectedType(undefined);
    setCategory('');
    setTag('');
    setSource('');
    setFrom('');
    setTo('');
    setSearchParams(toSearchParams({}, selectedCode));
  };
  const resetAdvancedFilters = () => {
    setSelectedType(undefined);
    setCategory('');
    setTag('');
    setSource('');
    setFrom('');
    setTo('');
    updateFilters({
      ...filters,
      category: undefined,
      tag: undefined,
      type: undefined,
      source: undefined,
      from: undefined,
      to: undefined,
    });
  };
  const applyQuickType = (type?: NoteType) => {
    setSelectedType(type);
    updateFilters({ ...filters, type });
  };
  const activeFilterCount = [
    filters.type,
    filters.category,
    filters.tag,
    filters.source,
    filters.from,
    filters.to,
  ].filter(Boolean).length;
  const hasActiveQuery = filters.q !== undefined || activeFilterCount > 0;
  const previewUrl = (code: string) => `/notes?${toSearchParams(filters, code).toString()}`;
  const closePreview = () => setSearchParams(toSearchParams(filters));

  return (
    <div className='space-y-7'>
      <NavigationNotice />
      <PageHeader
        actions={<ButtonLink icon={<Plus aria-hidden='true' size={18} />} label='Buat catatan' to='/notes/new' />}
        title='Notes'
      />
      <NotesToolbar
        activeFilterCount={activeFilterCount}
        activeType={filters.type}
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
        onQuickTypeChange={applyQuickType}
        onReset={resetAdvancedFilters}
        onSearch={applySearch}
        onTagChange={setTag}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        onTypeChange={setSelectedType}
        query={query}
        selectedType={selectedType}
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
          {notes.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
          {notes.status === 'error' ? <ErrorState onRetry={notes.retry} /> : null}
          {notes.status === 'success' && notes.data.length === 0 ? (
            <ContentState
              title={hasActiveQuery ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan'}
              description={
                hasActiveQuery
                  ? 'Coba gunakan kata kunci atau filter lain.'
                  : 'Catatan yang disimpan melalui Hermes akan muncul di sini.'
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
          {notes.status === 'success' && notes.data.length > 0 ? (
            <NoteList notes={notes.data} selectedCode={selectedCode} toDetail={previewUrl} />
          ) : null}
        </div>

        {selectedCode !== undefined ? (
          <div className='min-w-0 max-xl:col-span-full'>
            {detail.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
            {detail.status === 'error' ? (
              <QueryError
                error={detail.error}
                notFound={{
                  title: 'Catatan tidak ditemukan',
                  description: 'Catatan ini mungkin sudah tidak tersedia.',
                  action: (
                    <Button variant='secondary' onClick={closePreview}>
                      Kembali ke Notes
                    </Button>
                  ),
                }}
                onRetry={detail.retry}
              />
            ) : null}
            {detail.status === 'success' && detail.data !== null ? (
              <NoteDetailPane
                key={selectedCode}
                actions={
                  <NoteActions
                    key={selectedCode}
                    note={detail.data}
                    onDeleted={() => {
                      closePreview();
                      notes.retry();
                    }}
                  />
                }
                note={detail.data}
                onClose={closePreview}
                onOpenPage={() =>
                  navigate(`/notes/${selectedCode}`, { state: { returnTo: location.pathname + location.search } })
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NotesListPage;
