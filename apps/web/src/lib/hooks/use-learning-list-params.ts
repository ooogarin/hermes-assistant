import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const optional = (value: string | null): string | undefined => value?.trim() || undefined;
const list = (value: string | null): string[] => [
  ...new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export const useLearningListParams = <Status extends string>(statuses: readonly Status[]) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedQuery = optional(searchParams.get('q'));
  const appliedGenre = optional(searchParams.get('genre'));
  const levels = list(searchParams.get('levels') ?? searchParams.get('level'));
  const rawStatus = optional(searchParams.get('status'));
  const status = statuses.find((value) => value === rawStatus);
  const rawPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [query, setQuery] = useState(appliedQuery ?? '');
  const [genre, setGenre] = useState(appliedGenre ?? '');

  useEffect(() => setQuery(appliedQuery ?? ''), [appliedQuery]);
  useEffect(() => setGenre(appliedGenre ?? ''), [appliedGenre]);

  const update = (changes: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') next.delete(name);
      else next.set(name, String(value));
    }
    setSearchParams(next);
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    if (value === '' && appliedQuery !== undefined) update({ page: 1, q: undefined });
  };
  const changeGenre = (value: string) => {
    setGenre(value);
    if (value === '' && appliedGenre !== undefined) update({ genre: undefined, page: 1 });
  };

  return {
    clearFilters: () => setSearchParams(new URLSearchParams()),
    filters: { genre: appliedGenre, levels, page, q: appliedQuery, status },
    genre,
    key: searchParams.toString(),
    query,
    setGenre: changeGenre,
    setLevels: (value: string[]) => update({ level: undefined, levels: value.join(',') || undefined, page: 1 }),
    setPage: (value: number) => update({ page: value }),
    setQuery: changeQuery,
    setStatus: (value?: Status) => update({ page: 1, status: value }),
    submitGenre: () => update({ genre: optional(genre), page: 1 }),
    submitQuery: () => update({ page: 1, q: optional(query) }),
  };
};
