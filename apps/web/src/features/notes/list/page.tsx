import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { NoteActions } from '../../../components/notes/note-actions';
import { NoteDetailPane } from '../../../components/notes/note-detail-pane';
import { NoteList } from '../../../components/notes/note-list';
import { NotesToolbar } from '../../../components/notes/notes-toolbar';
import { Button } from '../../../components/ui/button';
import { ButtonLink } from '../../../components/ui/button-link';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { optionalValue, useListParams } from '../../../lib/hooks/use-list-params';
import { getNote, getNotes } from '../notes-api';
import type { NoteType } from '../notes-api';

const noteTypes: NoteType[] = ['fact', 'personal', 'news', 'quote', 'idea', 'reminder'];

const NotesListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const list = useListParams({
    deferred: ['type', 'category', 'tag', 'source', 'from', 'to'],
    fields: {
      category: { param: 'category' },
      from: { param: 'from' },
      source: { param: 'source' },
      tag: { param: 'tag' },
      to: { param: 'to' },
      type: { param: 'type', values: noteTypes },
    },
    quick: 'type',
  });
  const selectedCode = optionalValue(list.searchParams.get('preview'));
  const notes = useApiQuery(list.key, (signal) =>
    getNotes(
      {
        category: list.filters.category,
        from: list.filters.from,
        q: list.filters.q,
        sort: list.filters.sort,
        source: list.filters.source,
        tag: list.filters.tag,
        to: list.filters.to,
        type: list.filters.type,
      },
      signal,
    ),
  );
  const detail = useApiQuery(selectedCode ?? 'no-selected-note', (signal) =>
    selectedCode === undefined ? Promise.resolve(null) : getNote(selectedCode, signal),
  );
  const dateRangeInvalid = Boolean(list.drafts.from && list.drafts.to && list.drafts.from > list.drafts.to);
  const closePreview = () => list.setParam('preview', undefined);
  const previewUrl = (code: string) => {
    const params = new URLSearchParams(list.searchParams);

    params.set('preview', code);

    return `/notes?${params.toString()}`;
  };

  return (
    <div className='space-y-7'>
      <NavigationNotice />
      <PageHeader
        actions={<ButtonLink icon={<Plus aria-hidden='true' size={18} />} label='Buat catatan' to='/notes/new' />}
        title='Notes'
      />
      <NotesToolbar
        activeFilterCount={list.activeFilterCount}
        activeType={list.filters.type}
        category={list.drafts.category}
        dateRangeInvalid={dateRangeInvalid}
        from={list.drafts.from}
        to={list.drafts.to}
        source={list.drafts.source}
        sort={list.filters.sort}
        filtersOpen={filtersOpen}
        onApplyFilters={list.applyFilters}
        onCategoryChange={(value) => list.setDraft('category', value)}
        onFromChange={(value) => list.setDraft('from', value)}
        onToChange={(value) => list.setDraft('to', value)}
        onSourceChange={(value) => list.setDraft('source', value)}
        onSortChange={list.toggleSort}
        onCloseFilters={() => setFiltersOpen(false)}
        onQueryChange={(value) => list.setQuery(value)}
        onQuickFilterChange={(value) => list.setQuick(value)}
        onResetFilters={list.resetFilters}
        onSearch={list.applyQuery}
        onTagChange={(value) => list.setDraft('tag', value)}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        onTypeChange={(value) => list.setDraft('type', value ?? '')}
        query={list.query}
        type={list.drafts.type || undefined}
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
          {notes.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
          {notes.status === 'error' ? <ErrorState onRetry={notes.retry} /> : null}
          {notes.status === 'success' && notes.data.length === 0 ? (
            <ContentState
              title={
                list.activeFilterCount > 0 || list.filters.q ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan'
              }
              description={
                list.activeFilterCount > 0 || list.filters.q
                  ? 'Coba gunakan kata kunci atau filter lain.'
                  : 'Catatan yang disimpan melalui Hermes akan muncul di sini.'
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
          {notes.status === 'success' && notes.data.length > 0 ? (
            <NoteList notes={notes.data} selectedCode={selectedCode} toDetail={previewUrl} />
          ) : null}
        </div>

        {selectedCode !== undefined ? (
          <div className='min-w-0 max-xl:col-span-full'>
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
