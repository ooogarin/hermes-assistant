import { ArrowDownUp } from 'lucide-react';
import { useState } from 'react';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionTable } from '../../../components/grammar/grammar-session-table';
import { PageHeader } from '../../../components/layout/page-header';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { FilterChip } from '../../../components/ui/filter-chip';
import { FilterPopover } from '../../../components/ui/filter-popover';
import { SearchForm } from '../../../components/ui/search-form';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { useDraftValue } from '../../../lib/hooks/use-draft-value';
import { useLearningListParams } from '../../../lib/hooks/use-learning-list-params';
import { getGrammarSessions } from '../grammar-api';
import type { GrammarSessionListFilters } from '../grammar-api';

const sessionStatuses = ['active', 'completed'] as const;
const sessionModes = ['practice', 'exam'] as const;
const sessionLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sessionListLimit = 100;

const GrammarListPage = () => {
  const {
    clearParams,
    key,
    query: appliedQuery,
    searchParams,
    setParams,
    setStatus,
    sort,
    status,
  } = useLearningListParams({ statusParam: 'status', statuses: sessionStatuses });
  const filters: GrammarSessionListFilters = {
    q: appliedQuery,
    status,
    mode: sessionModes.find((mode) => mode === searchParams.get('mode')),
    level: searchParams.get('level')?.trim() || undefined,
    limit: sessionListLimit,
    sort,
  };
  const [query, setQuery] = useDraftValue(appliedQuery ?? '');
  const [draftMode, setDraftMode] = useDraftValue(filters.mode);
  const [draftLevel, setDraftLevel] = useDraftValue(filters.level ?? '');
  const [open, setOpen] = useState(false);
  const sessions = useApiQuery(key, (signal) => getGrammarSessions(filters, signal));
  const hasFilters = Boolean(filters.q || filters.status || filters.mode || filters.level);

  return (
    <div className='space-y-7'>
      <PageHeader actions={<EnglishSettingsLink to='/english/grammar/settings' />} title='Grammar' />
      <div className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
          <SearchForm
            label='Cari sesi'
            placeholder='Cari kode sesi...'
            value={query}
            onChange={(value) => {
              setQuery(value);
              if (!value) setParams({ q: undefined });
            }}
            onSearch={() => setParams({ q: query.trim() || undefined })}
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
                    setParams({ level: undefined, mode: undefined });
                    setOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    setParams({ level: draftLevel.trim() || undefined, mode: draftMode });
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
            onClick={() => setParams({ sort: sort === 'oldest' ? 'newest' : 'oldest' })}
          >
            Urutkan: {sort === 'oldest' ? 'Terlama' : 'Terbaru'} <ArrowDownUp aria-hidden='true' size={17} />
          </Button>
        </div>
        <fieldset className='flex flex-wrap gap-2'>
          <legend className='sr-only'>Status sesi</legend>
          <FilterChip active={!status} onClick={() => setStatus(undefined)}>
            Semua
          </FilterChip>
          <FilterChip active={status === 'active'} onClick={() => setStatus('active')}>
            Aktif
          </FilterChip>
          <FilterChip active={status === 'completed'} onClick={() => setStatus('completed')}>
            Selesai
          </FilterChip>
        </fieldset>
      </div>
      {sessions.status === 'loading' ? <CollectionSkeleton rows={6} /> : null}
      {sessions.status === 'error' ? <ErrorState onRetry={sessions.retry} /> : null}
      {sessions.status === 'success' ? (
        sessions.data.items.length ? (
          <GrammarSessionTable items={sessions.data.items} />
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
                <Button variant='secondary' onClick={clearParams}>
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
