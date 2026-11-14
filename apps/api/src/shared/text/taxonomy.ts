export const normalizeTaxonomyValue = (value: string): string => value.trim().toLowerCase();

export const normalizeTags = (tags: string[]): string[] => [...new Set(tags.map(normalizeTaxonomyValue))];

export const normalizeLimitedTags = (tags: string[], maximumTags: number): string[] => {
  const normalizedTags = tags.map(normalizeTaxonomyValue).filter((tag) => tag.length > 0 && tag.length <= 64);

  return [...new Set(normalizedTags)].slice(0, maximumTags);
};

export const formatTaxonomyLabel = (value: string): string =>
  value.replace(/(^|[\s/_-])\p{L}/gu, (part) => part.toUpperCase());
