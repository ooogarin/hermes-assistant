import type { JunkItem } from './junk-api';

export { getSafeSourceUrl, getSourceHost, getSourceName } from '../../lib/formatting/source';

const truncate = (value: string, length: number): string =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

export const getJunkTitle = (item: JunkItem): string =>
  item.title ?? truncate(item.contentText ?? item.sourceUrl ?? item.rawText ?? item.code, 90);

export const getJunkExcerpt = (item: JunkItem): string | null => {
  return item.contentText?.replace(/\s+/g, ' ').trim() || null;
};
