export const normalizeTaxonomyValue = (value: string): string => value.trim().toLowerCase();

export const normalizeTags = (tags: string[]): string[] => [...new Set(tags.map(normalizeTaxonomyValue))];

export const formatTaxonomyLabel = (value: string): string =>
  value.replace(/(^|[\s/_-])\p{L}/gu, (part) => part.toUpperCase());
