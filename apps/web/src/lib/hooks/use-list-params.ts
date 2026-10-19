import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ListField<Values extends readonly string[] = readonly string[]> = {
  /** An older name of the parameter, still read but replaced when the filter changes. */
  alias?: string;
  /** The name of the query parameter. */
  param: string;
  /** The values the field accepts, when it is a choice. */
  values?: Values;
};

type ListFieldValue<Field> = Field extends { values: readonly (infer Value)[] }
  ? Value | undefined
  : string | undefined;

export type ListFilterValues<Fields extends Record<string, ListField>> = {
  [Key in keyof Fields]: ListFieldValue<Fields[Key]>;
};

type ListDraftValue<Field> = Field extends { values: readonly (infer Value)[] } ? '' | Value : string;

export type ListDraftValues<Fields extends Record<string, ListField>> = {
  [Key in keyof Fields]: ListDraftValue<Fields[Key]>;
};

type ListParamsOptions<Fields extends Record<string, ListField>> = {
  /** The filters the page offers, besides the search text and the sort order. */
  fields: Fields;
  /** The filters that wait for the reader to apply them. */
  deferred?: ReadonlyArray<keyof Fields>;
  /** The filter the quick filters change. */
  quick?: keyof Fields;
};

export const optionalValue = (value: string | null | undefined): string | undefined => value?.trim() || undefined;

const readField = (field: ListField, params: URLSearchParams): string | undefined => {
  const value = optionalValue(params.get(field.param) ?? (field.alias === undefined ? null : params.get(field.alias)));

  if (value === undefined) return undefined;
  if (field.values === undefined) return value;

  return field.values.includes(value) ? value : undefined;
};

/**
 * Keeps the browser URL as the source of truth for the filters of a list.
 *
 * Every list offers the same things: a search text, a sort order, and a set of
 * filters. Some filters apply right away, the ones in the popover wait for the
 * reader to apply them.
 */
export const useListParams = <Fields extends Record<string, ListField>>({
  deferred = [],
  fields,
  quick,
}: ListParamsOptions<Fields>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryDraft, setQueryDraft] = useState(() => optionalValue(searchParams.get('q')) ?? '');
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};

    for (const name of deferred) {
      const field = fields[name];

      if (field !== undefined) {
        initial[name as string] = readField(field, searchParams) ?? '';
      }
    }

    return initial;
  });

  const applied = {} as ListFilterValues<Fields>;

  for (const [name, field] of Object.entries(fields) as Array<[string, ListField]>) {
    (applied as Record<string, string | undefined>)[name] = readField(field, searchParams);
  }
  const query = optionalValue(searchParams.get('q'));
  const sort: 'newest' | 'oldest' = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const optionsRef = useRef({ deferred, fields });
  optionsRef.current = { deferred, fields };
  const appliedRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const names = optionsRef.current.deferred;
    const descriptors = optionsRef.current.fields;
    const appliedNow: Record<string, string> = {};

    for (const name of names) {
      const field = descriptors[name];

      if (field !== undefined) {
        appliedNow[name as string] = readField(field, searchParams) ?? '';
      }
    }

    const changed = Object.keys(appliedNow).some((name) => appliedRef.current[name] !== appliedNow[name]);

    if (!changed) return;

    appliedRef.current = appliedNow;
    setDrafts(appliedNow);
  }, [searchParams]);

  useEffect(() => {
    const next = query ?? '';

    setQueryDraft((current) => (current === next ? current : next));
  }, [query]);

  const setParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);

        for (const [name, value] of Object.entries(changes)) {
          if (value === undefined || value === '') {
            next.delete(name);
          } else {
            next.set(name, value);
          }
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const setParam = useCallback(
    (name: string, value: string | undefined) => {
      setParams({ [name]: value });
    },
    [setParams],
  );

  const setDraft = useCallback(<Key extends keyof Fields>(name: Key, value: ListDraftValue<Fields[Key]>) => {
    setDrafts((current) => ({ ...current, [name]: value }));
  }, []);

  const setQuery = useCallback((value: string) => {
    setQueryDraft(value);
  }, []);

  const applyFilters = useCallback(() => {
    const changes: Record<string, string | undefined> = {};

    for (const [name, value] of Object.entries(drafts)) {
      const field = fields[name];

      if (field !== undefined) {
        if (field.alias !== undefined) {
          changes[field.alias] = undefined;
        }

        changes[field.param] = value;
      }
    }

    setParams(changes);
  }, [drafts, fields, setParams]);

  const resetFilters = useCallback(() => {
    const next: Record<string, string> = {};

    for (const name of deferred) {
      const field = fields[name];

      if (field !== undefined) {
        next[name as string] = readField(field, searchParams) ?? '';
      }
    }

    setDrafts(next);
  }, [deferred, fields, searchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const applyQuery = useCallback(() => {
    setParam('q', queryDraft);
  }, [queryDraft, setParam]);

  const setQuick = useCallback(
    (value: string | undefined) => {
      if (quick === undefined) return;

      const field = fields[quick];

      if (field === undefined) return;

      const changes: Record<string, string | undefined> = { [field.param]: value };

      if (field.alias !== undefined) {
        changes[field.alias] = undefined;
      }

      if (deferred.includes(quick)) {
        setDraft(quick, (value ?? '') as ListDraftValue<Fields[typeof quick]>);
      }

      setParams(changes);
    },
    [deferred, fields, quick, setDraft, setParams],
  );

  const toggleSort = useCallback(() => {
    setParam('sort', sort === 'oldest' ? undefined : 'oldest');
  }, [setParam, sort]);

  const activeFilterCount = Object.values(applied).filter(Boolean).length;
  const filters = { ...applied, q: query, sort };

  return {
    activeFilterCount,
    applyFilters,
    applyQuery,
    clearFilters,
    drafts: drafts as unknown as ListDraftValues<Fields>,
    filters,
    /** Changes when the applied filters change, not when the URL changes. */
    key: JSON.stringify(filters),
    query: queryDraft,
    resetFilters,
    searchParams,
    setDraft,
    setParam,
    setQuick,
    setQuery,
    sort,
    toggleSort,
  };
};
