type QueryValue = boolean | number | string | null | undefined;

export const buildQueryString = (values: Record<string, QueryValue>): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) {
      continue;
    }

    const normalizedValue = typeof value === 'string' ? value.trim() : String(value);
    if (normalizedValue.length > 0) {
      query.set(key, normalizedValue);
    }
  }

  const serializedQuery = query.toString();
  return serializedQuery.length > 0 ? `?${serializedQuery}` : '';
};
