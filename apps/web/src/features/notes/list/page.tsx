import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { NoteDetailPane } from '../../../components/notes/note-detail-pane';
import { NoteList } from '../../../components/notes/note-list';
import { NotesToolbar } from '../../../components/notes/notes-toolbar';
import { Button } from '../../../components/ui/button';
import { ButtonLink } from '../../../components/ui/button-link';
import { ApiError } from '../../../lib/api/api-error';
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
  if (previewCode !== undefined) params.set('preview', previewCode);
  return params;
};

const NotesListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCode = getOptionalValue(searchParams.get('preview'));
  const filters: NoteListFilters = {
    category: getOptionalValue(searchParams.get('category')),
    q: getOptionalValue(searchParams.get('q')),
    tag: getOptionalValue(searchParams.get('tag')),
    type: parseNoteType(searchParams.get('type')),
  };
  const listKey = `${filters.q ?? ''}:${filters.type ?? ''}:${filters.category ?? ''}:${filters.tag ?? ''}`;
  const notes = useApiQuery(listKey, (signal) => getNotes(filters, signal));
  const detail = useApiQuery(selectedCode ?? 'no-selected-note', (signal) =>
    selectedCode === undefined ? Promise.resolve(null) : getNote(selectedCode, signal),
  );
  const [query, setQuery] = useState(filters.q ?? '');
  const [selectedType, setSelectedType] = useState<NoteType | undefined>(filters.type);
  const [category, setCategory] = useState(filters.category ?? '');
  const [tag, setTag] = useState(filters.tag ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setQuery(filters.q ?? '');
    setSelectedType(filters.type);
    setCategory(filters.category ?? '');
    setTag(filters.tag ?? '');
  }, [filters.category, filters.q, filters.tag, filters.type]);

  const updateFilters = (next: NoteListFilters) => setSearchParams(toSearchParams(next, selectedCode));
  const applySearch = () => updateFilters({ ...filters, q: getOptionalValue(query) });
  const applyFilters = () => {
    updateFilters({
      ...filters,
      category: getOptionalValue(category),
      tag: getOptionalValue(tag),
      type: selectedType,
    });
    setFiltersOpen(false);
  };
  const clearFilters = () => {
    setQuery('');
    setSelectedType(undefined);
    setCategory('');
    setTag('');
    setSearchParams(toSearchParams({}, selectedCode));
  };
  const resetAdvancedFilters = () => {
    setSelectedType(undefined);
    setCategory('');
    setTag('');
    updateFilters({ ...filters, category: undefined, tag: undefined, type: undefined });
  };
  const applyQuickType = (type?: NoteType) => {
    setSelectedType(type);
    updateFilters({ ...filters, type });
  };
  const activeFilterCount = [filters.type, filters.category, filters.tag].filter(Boolean).length;
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
        filtersOpen={filtersOpen}
        onApply={applyFilters}
        onCategoryChange={setCategory}
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
            : 'grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.75fr)]'
        }
      >
        <div className={selectedCode === undefined ? undefined : 'max-xl:hidden'}>
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
          <div className='max-xl:col-span-full'>
            {detail.status === 'loading' ? <CollectionSkeleton rows={4} /> : null}
            {detail.status === 'error' ? (
              detail.error instanceof ApiError && detail.error.status === 404 ? (
                <ContentState
                  title='Catatan tidak ditemukan'
                  description='Catatan ini mungkin sudah tidak tersedia.'
                  action={
                    <Button variant='secondary' onClick={closePreview}>
                      Kembali ke Notes
                    </Button>
                  }
                />
              ) : (
                <ErrorState onRetry={detail.retry} />
              )
            ) : null}
            {detail.status === 'success' && detail.data !== null ? (
              <NoteDetailPane
                note={detail.data}
                onClose={closePreview}
                onOpenPage={() => navigate(`/notes/${selectedCode}`)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NotesListPage;
