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
import { usePersonalContentList } from '../../../lib/hooks/use-personal-content-list';
import { getNote, getNotes, parseNoteType } from '../notes-api';
import type { NoteType } from '../notes-api';

const NotesListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const list = usePersonalContentList<NoteType | undefined>({
    basePath: '/notes',
    emptyExtra: undefined,
    readExtra: (params) => parseNoteType(params.get('type')),
    writeExtra: (type) => ({ type }),
  });
  const notes = useApiQuery(list.listKey, (signal) => getNotes({ ...list.filters, type: list.extra }, signal));
  const detail = useApiQuery(list.previewCode ?? 'no-selected-note', (signal) =>
    list.previewCode === undefined ? Promise.resolve(null) : getNote(list.previewCode, signal),
  );
  const selectedCode = list.previewCode;
  const dateRangeInvalid = Boolean(list.drafts.from && list.drafts.to && list.drafts.from > list.drafts.to);

  const applyQuickType = (type?: NoteType) => {
    list.setExtraDraft(type);
    list.updateFilters({ ...list.filters }, type);
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
        activeType={list.extra}
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
        onQuickTypeChange={applyQuickType}
        onReset={list.resetAdvancedFilters}
        onSearch={list.applySearch}
        onTagChange={(value) => list.setDraft('tag', value)}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        onTypeChange={(value) => list.setExtraDraft(value ?? undefined)}
        query={list.drafts.q}
        selectedType={list.extraDraft}
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
              title={list.hasActiveQuery ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan'}
              description={
                list.hasActiveQuery
                  ? 'Coba gunakan kata kunci atau filter lain.'
                  : 'Catatan yang disimpan melalui Hermes akan muncul di sini.'
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
          {notes.status === 'success' && notes.data.length > 0 ? (
            <NoteList notes={notes.data} selectedCode={selectedCode} toDetail={list.previewUrl} />
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
                    <Button variant='secondary' onClick={list.closePreview}>
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
                      list.closePreview();
                      notes.retry();
                    }}
                  />
                }
                note={detail.data}
                onClose={list.closePreview}
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
