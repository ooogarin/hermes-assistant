import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';

const junkItemSchema = z
  .object({
    code: z.string(),
    title: z.string().nullable(),
    category: z.string(),
    raw_text: z.string().nullable(),
    content_text: z.string().nullable(),
    source_url: z.string().url().nullable(),
    tags: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable(),
  })
  .transform(({ content_text, created_at, deleted_at, raw_text, source_url, updated_at, ...item }) => ({
    ...item,
    contentText: content_text,
    createdAt: created_at,
    deletedAt: deleted_at,
    rawText: raw_text,
    sourceUrl: source_url,
    updatedAt: updated_at,
  }));

const junkListSchema = z.object({ items: z.array(junkItemSchema) }).transform(({ items }) => items);

export type JunkItem = z.output<typeof junkItemSchema>;
export type JunkListFilters = { category?: string; q?: string; sourceUrl?: string; tag?: string };

export const getJunkItems = (filters: JunkListFilters, signal?: AbortSignal): Promise<JunkItem[]> =>
  apiRequest(`/api/v1/junk${buildQueryString({ ...filters, limit: 100 })}`, junkListSchema, { signal });

export const getJunkItem = (code: string, signal?: AbortSignal): Promise<JunkItem> =>
  apiRequest(`/api/v1/junk/${encodeURIComponent(code)}`, junkItemSchema, { signal });
