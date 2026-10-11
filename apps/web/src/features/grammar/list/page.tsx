import { ArrowDownUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionTable } from '../../../components/grammar/grammar-session-table';
import { PageHeader } from '../../../components/layout/page-header';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { CollectionPagination } from '../../../components/ui/collection-pagination';
import { FilterChip } from '../../../components/ui/filter-chip';
import { FilterPopover } from '../../../components/ui/filter-popover';
import { SearchForm } from '../../../components/ui/search-form';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarSessions } from '../grammar-api';
import type { GrammarSessionListFilters } from '../grammar-api';

const sessionStatuses = ['active', 'completed'] as const;
const sessionModes = ['practice', 'exam'] as const;
const sessionLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sessionsPerPage = 20;

const GrammarListPage = () => {
  const [params, setParams] = useSearchParams();
  const rawMode = params.get('mode');
  const rawLevel = params.get('level');
  const requestedPage = Number.parseInt(params.get('page') ?? '', 10);
  const filters: GrammarSessionListFilters = {
    q: params.get('q')?.trim() || undefined,
    status: sessionStatuses.find((status) => status === params.get('status')),
    mode: sessionModes.find((mode) => mode === rawMode),
    level: rawLevel?.trim() || undefined,
    page: Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage,
    limit: sessionsPerPage,
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
  };
  const [query, setQuery] = useState(filters.q ?? '');
  const [draftMode, setDraftMode] = useState<GrammarSessionListFilters['mode']>(filters.mode);
  const [draftLevel, setDraftLevel] = useState(filters.level ?? '');
  const [open, setOpen] = useState(false);
  const sessions = useApiQuery(params.toString(), (signal) => getGrammarSessions(filters, signal));
  const hasFilters = Boolean(filters.q || filters.status || filters.mode || filters.level);

  useEffect(() => {
    setDraftMode(sessionModes.find((mode) => mode === rawMode));
    setDraftLevel(rawLevel?.trim() ?? '');
  }, [rawMode, rawLevel]);

  const update = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(params);
    next.delete('page');

    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name);
      } else {
        next.set(name, String(value));
      }
    }

    setParams(next);
  };

  return (
    <div className='space-y-7'>
      <PageHeader title='Grammar' actions={<EnglishSettingsLink to='/english/grammar/settings' />} />
      <div className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
          <SearchForm
            label='Cari sesi'
            placeholder='Cari grammar point atau sesi...'
            value={query}
            onChange={(value) => {
              setQuery(value);
              if (!value) update({ q: undefined });
            }}
            onSearch={() => update({ q: query.trim() || undefined })}
          />
          <FilterPopover
            activeCount={Number(Boolean(filters.mode)) + Number(Boolean(filters.level))}
            id='grammar-filters'
            label='Filter Grammar'
            open={open}
            onToggle={() => setOpen(!open)}
            onClose={() => setOpen(false)}
          >
            <div className='space-y-4'>
              <ChoiceDropdown
                label='Filter mode'
                mode='single'
                onChange={(value) => setDraftMode(value ?? undefined)}
                options={[
                  { label: 'Practice', value: 'practice' },
                  { label: 'Exam', value: 'exam' },
                ]}
                placeholder='Semua mode'
                searchable={false}
                value={draftMode ?? null}
              />
              <ChoiceDropdown
                label='Filter level'
                mode='single'
                onChange={(value) => setDraftLevel(value ?? '')}
                options={sessionLevels.map((level) => ({ label: level, value: level }))}
                placeholder='Semua level'
                searchable={false}
                value={draftLevel || null}
              />
              <div className='flex justify-between gap-3'>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setDraftMode(undefined);
                    setDraftLevel('');
                    update({ level: undefined, mode: undefined });
                    setOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    update({ level: draftLevel.trim() || undefined, mode: draftMode });
                    setOpen(false);
                  }}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </FilterPopover>
          <Button
            className='h-12 lg:shrink-0'
            variant='secondary'
            onClick={() => update({ sort: filters.sort === 'oldest' ? 'newest' : 'oldest' })}
          >
            Urutkan: {filters.sort === 'oldest' ? 'Terlama' : 'Terbaru'} <ArrowDownUp aria-hidden='true' size={17} />
          </Button>
        </div>
        <fieldset className='flex flex-wrap gap-2'>
          <legend className='sr-only'>Status sesi</legend>
          <FilterChip active={!filters.status} onClick={() => update({ status: undefined })}>
            Semua
          </FilterChip>
          <FilterChip active={filters.status === 'active'} onClick={() => update({ status: 'active' })}>
            Aktif
          </FilterChip>
          <FilterChip active={filters.status === 'completed'} onClick={() => update({ status: 'completed' })}>
            Selesai
          </FilterChip>
        </fieldset>
      </div>
      {sessions.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {sessions.status === 'error' ? <ErrorState onRetry={sessions.retry} /> : null}
      {sessions.status === 'success' ? (
        sessions.data.items.length ? (
          <>
            <GrammarSessionTable items={sessions.data.items} />
            {sessions.data.meta.totalPages > 1 ? (
              <CollectionPagination
                itemLabel='sesi'
                itemCount={sessions.data.items.length}
                limit={sessions.data.meta.limit}
                onPageChange={(page) => update({ page })}
                page={sessions.data.meta.page}
                total={sessions.data.meta.total}
                totalPages={sessions.data.meta.totalPages}
              />
            ) : null}
          </>
        ) : (
          <ContentState
            title={hasFilters ? 'Tidak ada sesi yang cocok' : 'Belum ada sesi Grammar'}
            description={
              hasFilters
                ? 'Coba pencarian atau filter lain.'
                : 'Sesi dari latihan harian atau permintaan lewat Hermes akan muncul di sini.'
            }
            action={
              hasFilters ? (
                <Button variant='secondary' onClick={() => setParams(new URLSearchParams())}>
                  Hapus filter
                </Button>
              ) : undefined
            }
          />
        )
      ) : null}
    </div>
  );
};

export default GrammarListPage;
