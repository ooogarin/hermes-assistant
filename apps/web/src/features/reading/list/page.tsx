import { ArrowDownUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EnglishSettingsLink } from '../../../components/english/english-settings-link';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { PageHeader } from '../../../components/layout/page-header';
import { ReadingList } from '../../../components/reading/reading-list';
import { Button } from '../../../components/ui/button';
import { ChoiceDropdown } from '../../../components/ui/choice-dropdown';
import { FilterChip } from '../../../components/ui/filter-chip';
import { FilterPopover } from '../../../components/ui/filter-popover';
import { TextField } from '../../../components/ui/form-field';
import { SearchForm } from '../../../components/ui/search-form';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getReadingMaterials } from '../reading-api';
import type { ReadingListFilters } from '../reading-api';

const ReadingListPage = () => {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('reading_status');
  const levelsKey = params.get('levels') ?? '';
  const filters: ReadingListFilters = {
    q: params.get('q')?.trim() || undefined,
    reading_status: rawStatus === 'read' || rawStatus === 'unread' ? rawStatus : undefined,
    levels: levelsKey.split(',').filter(Boolean),
    genre: params.get('genre')?.trim() || undefined,
    limit: 100,
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
  };
  const [query, setQuery] = useState(filters.q ?? '');
  const [levels, setLevels] = useState(filters.levels ?? []);
  const [genre, setGenre] = useState(filters.genre ?? '');
  const [open, setOpen] = useState(false);
  const key = JSON.stringify(filters);
  useEffect(() => {
    setQuery(filters.q ?? '');
    setGenre(filters.genre ?? '');
    setLevels(levelsKey.split(',').filter(Boolean));
  }, [filters.q, filters.genre, levelsKey]);
  const update = (changes: Partial<ReadingListFilters>) => {
    const next = { ...filters, ...changes };
    const value = new URLSearchParams();
    if (next.q) value.set('q', next.q);
    if (next.reading_status) value.set('reading_status', next.reading_status);
    if (next.genre) value.set('genre', next.genre);
    if (next.levels?.length) value.set('levels', next.levels.join(','));
    if (next.sort === 'oldest') value.set('sort', 'oldest');
    setParams(value);
  };
  const materials = useApiQuery(key, (signal) => getReadingMaterials(filters, signal));
  const hasFilters = Boolean(filters.q || filters.reading_status || filters.levels?.length || filters.genre);
  return (
    <div className='space-y-7'>
      <PageHeader title='Reading' actions={<EnglishSettingsLink to='/english/reading/settings' />} />
      <div className='space-y-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-stretch'>
          <SearchForm
            label='Cari bacaan'
            placeholder='Cari bacaan...'
            value={query}
            onChange={(value) => {
              setQuery(value);
              if (!value) update({ q: undefined });
            }}
            onSearch={() => update({ q: query.trim() || undefined })}
          />
          <FilterPopover
            activeCount={Number(Boolean(filters.genre)) + (filters.levels?.length ?? 0)}
            id='reading-filters'
            label='Filter Reading'
            open={open}
            onToggle={() => setOpen(!open)}
            onClose={() => setOpen(false)}
          >
            <div className='space-y-4'>
              <ChoiceDropdown
                mode='multiple'
                label='Filter level'
                placeholder='Semua level'
                value={levels}
                onChange={setLevels}
                options={['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((value) => ({ value, label: value }))}
              />
              <TextField
                label='Genre'
                placeholder='Semua genre'
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              />
              <div className='flex justify-between gap-3'>
                <Button
                  variant='secondary'
                  onClick={() => {
                    setGenre('');
                    setLevels([]);
                    update({ genre: undefined, levels: [] });
                    setOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={() => {
                    update({ genre: genre.trim() || undefined, levels });
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
          <legend className='sr-only'>Status baca</legend>
          <FilterChip active={!filters.reading_status} onClick={() => update({ reading_status: undefined })}>
            Semua
          </FilterChip>
          <FilterChip active={filters.reading_status === 'unread'} onClick={() => update({ reading_status: 'unread' })}>
            Belum dibaca
          </FilterChip>
          <FilterChip active={filters.reading_status === 'read'} onClick={() => update({ reading_status: 'read' })}>
            Sudah dibaca
          </FilterChip>
        </fieldset>
      </div>
      {materials.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {materials.status === 'error' ? <ErrorState onRetry={materials.retry} /> : null}
      {materials.status === 'success' ? (
        materials.data.items.length ? (
          <ReadingList items={materials.data.items} />
        ) : (
          <ContentState
            title={hasFilters ? 'Tidak ada bacaan yang cocok' : 'Belum ada bacaan'}
            description={
              hasFilters ? 'Coba pencarian atau filter lain.' : 'Bacaan yang dibuat melalui Hermes akan muncul di sini.'
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
export default ReadingListPage;
