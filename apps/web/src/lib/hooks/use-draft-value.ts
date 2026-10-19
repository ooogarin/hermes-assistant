import { useEffect, useState } from 'react';

/**
 * Holds a local draft that starts from the applied value and follows it whenever
 * the applied value changes. Use it for filters that need an explicit apply step.
 */
export const useDraftValue = <Value extends string | undefined>(applied: Value) => {
  const [draft, setDraft] = useState(applied);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  return [draft, setDraft] as const;
};
