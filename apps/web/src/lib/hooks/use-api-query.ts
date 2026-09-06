import { useCallback, useEffect, useRef, useState } from 'react';

type QueryState<Data> = { status: 'loading' } | { data: Data; status: 'success' } | { error: unknown; status: 'error' };

export const useApiQuery = <Data>(key: string, loadQuery: (signal: AbortSignal) => Promise<Data>) => {
  const controllerRef = useRef<AbortController>(null);
  const loadQueryRef = useRef(loadQuery);
  const [state, setState] = useState<QueryState<Data>>({ status: 'loading' });
  loadQueryRef.current = loadQuery;

  const load = useCallback(() => {
    void key;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });

    loadQueryRef
      .current(controller.signal)
      .then((data) => setState({ data, status: 'success' }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setState({ error, status: 'error' });
      });
  }, [key]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  return { ...state, retry: load };
};
