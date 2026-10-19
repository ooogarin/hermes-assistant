import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type PersonalContentFilters = {
  category?: string;
  from?: string;
  q?: string;
  source?: string;
  sort?: 'newest' | 'oldest';
  tag?: string;
  to?: string;
};

export type PersonalContentDrafts = {
  category: string;
  from: string;
  q: string;
  source: string;
  tag: string;
  to: string;
};

export const optionalValue = (value: string | null | undefined): string | undefined => value?.trim() || undefined;

const emptyDrafts: PersonalContentDrafts = {
  category: '',
  from: '',
  q: '',
  source: '',
  tag: '',
  to: '',
};

const toSearchParams = (
  filters: PersonalContentFilters,
  extraParams: Record<string, string | undefined>,
  previewCode?: string,
): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.q !== undefined) params.set('q', filters.q);
  if (filters.category !== undefined) params.set('category', filters.category);
  if (filters.tag !== undefined) params.set('tag', filters.tag);
  if (filters.source !== undefined) params.set('source', filters.source);
  if (filters.from !== undefined) params.set('from', filters.from);
  if (filters.to !== undefined) params.set('to', filters.to);
  if (filters.sort === 'oldest') params.set('sort', 'oldest');

  for (const [name, value] of Object.entries(extraParams)) {
    if (value !== undefined) params.set(name, value);
  }

  if (previewCode !== undefined) params.set('preview', previewCode);

  return params;
};

type PersonalContentListOptions<Extra extends string | undefined> = {
  /** Path the list lives on, used for the preview link. */
  basePath: string;
  /** Value that means the feature filter is not set. */
  emptyExtra: Extra;
  /** Reads the filter that belongs to the feature from the query string. */
  readExtra: (params: URLSearchParams) => Extra;
  /** Writes the filter that belongs to the feature into the query string. */
  writeExtra: (value: Extra) => Record<string, string | undefined>;
};

/**
 * Keeps the browser URL as the source of truth for a list of stored records.
 *
 * The feature keeps the filter that only it understands, the hook keeps the
 * shared ones and the draft values that wait for the reader to apply them.
 */
export const usePersonalContentList = <Extra extends string | undefined>({
  basePath,
  emptyExtra,
  readExtra,
  writeExtra,
}: PersonalContentListOptions<Extra>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const previewCode = optionalValue(searchParams.get('preview'));
  const filters: PersonalContentFilters = {
    category: optionalValue(searchParams.get('category')),
    from: optionalValue(searchParams.get('from')),
    q: optionalValue(searchParams.get('q')),
    source: optionalValue(searchParams.get('source')),
    sort: searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest',
    tag: optionalValue(searchParams.get('tag')),
    to: optionalValue(searchParams.get('to')),
  };
  const extra = readExtra(searchParams);
  const [drafts, setDrafts] = useState<PersonalContentDrafts>(() => ({
    category: filters.category ?? '',
    from: filters.from ?? '',
    q: filters.q ?? '',
    source: filters.source ?? '',
    tag: filters.tag ?? '',
    to: filters.to ?? '',
  }));
  const [extraDraft, setExtraDraft] = useState<Extra>(extra);

  useEffect(() => {
    setDrafts({
      category: filters.category ?? '',
      from: filters.from ?? '',
      q: filters.q ?? '',
      source: filters.source ?? '',
      tag: filters.tag ?? '',
      to: filters.to ?? '',
    });
    setExtraDraft(extra);
  }, [extra, filters.category, filters.from, filters.q, filters.source, filters.tag, filters.to]);

  const updateFilters = (next: PersonalContentFilters, nextExtra: Extra) => {
    setSearchParams(toSearchParams(next, writeExtra(nextExtra), previewCode));
  };

  const setDraft = (name: keyof PersonalContentDrafts, value: string) => {
    setDrafts((current) => ({ ...current, [name]: value }));
  };

  const applySearch = () => updateFilters({ ...filters, q: optionalValue(drafts.q) }, extra);

  const applyFilters = () =>
    updateFilters(
      {
        ...filters,
        category: optionalValue(drafts.category),
        from: optionalValue(drafts.from),
        source: optionalValue(drafts.source),
        tag: optionalValue(drafts.tag),
        to: optionalValue(drafts.to),
      },
      extraDraft,
    );

  const clearFilters = () => {
    setDrafts(emptyDrafts);
    setExtraDraft(emptyExtra);
    updateFilters({}, emptyExtra);
  };

  const resetAdvancedFilters = () => {
    setDrafts({ ...emptyDrafts, q: drafts.q });
    setExtraDraft(emptyExtra);
    updateFilters(
      {
        ...filters,
        category: undefined,
        from: undefined,
        source: undefined,
        tag: undefined,
        to: undefined,
      },
      emptyExtra,
    );
  };

  const toggleSort = () => updateFilters({ ...filters, sort: filters.sort === 'oldest' ? 'newest' : 'oldest' }, extra);

  const activeFilterCount = [extra, filters.category, filters.tag, filters.source, filters.from, filters.to].filter(
    Boolean,
  ).length;
  const hasActiveQuery = filters.q !== undefined || activeFilterCount > 0;
  const listKey = toSearchParams(filters, writeExtra(extra)).toString();
  const previewUrl = (code: string) => `${basePath}?${toSearchParams(filters, writeExtra(extra), code).toString()}`;
  const closePreview = () => setSearchParams(toSearchParams(filters, writeExtra(extra)));

  return {
    activeFilterCount,
    applyFilters,
    applySearch,
    clearFilters,
    closePreview,
    drafts,
    extra,
    extraDraft,
    filters,
    hasActiveQuery,
    listKey,
    previewCode,
    previewUrl,
    resetAdvancedFilters,
    setDraft,
    setExtraDraft,
    toggleSort,
    updateFilters,
  };
};
