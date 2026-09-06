import type { JunkItem } from './junk-api';

const truncate = (value: string, length: number): string =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

export const getJunkTitle = (item: JunkItem): string =>
  item.title ?? truncate(item.contentText ?? item.sourceUrl ?? item.rawText ?? item.code, 90);

export const getJunkExcerpt = (item: JunkItem): string | null => {
  const value = item.contentText ?? item.rawText;
  return value === null ? null : truncate(value, 150);
};

export const getSourceHost = (sourceUrl: string | null): string | null => {
  if (sourceUrl === null) return null;
  return new URL(sourceUrl).hostname.replace(/^www\./, '');
};
