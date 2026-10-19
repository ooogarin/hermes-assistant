import { useSearchParams } from 'react-router-dom';

export type ListParamValue = string | string[] | undefined;

type LearningListParamsOptions<Status extends string> = {
  statusParam: string;
  statuses: readonly Status[];
};

/**
 * Owns the browser URL as the single source of truth for a learning list page.
 *
 * The page reads the applied filters from the returned values and writes changes
 * back with `setParams`, so a shared link always reproduces the same list.
 */
export const useLearningListParams = <Status extends string>({
  statusParam,
  statuses,
}: LearningListParamsOptions<Status>) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setParams = (changes: Record<string, ListParamValue>) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);

      for (const [name, value] of Object.entries(changes)) {
        if (value === undefined || value === '') {
          next.delete(name);
        } else if (Array.isArray(value)) {
          next.set(name, value.join(','));
        } else {
          next.set(name, value);
        }
      }

      return next;
    });
  };

  const clearParams = () => setSearchParams(new URLSearchParams());

  const query = searchParams.get('q')?.trim() || undefined;
  const sort: 'newest' | 'oldest' = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const rawStatus = searchParams.get(statusParam)?.trim();
  const status = statuses.find((value) => value === rawStatus);

  const setStatus = (value?: Status) => setParams({ [statusParam]: value });

  return {
    clearParams,
    key: searchParams.toString(),
    query,
    searchParams,
    setParams,
    setStatus,
    sort,
    status,
  };
};
