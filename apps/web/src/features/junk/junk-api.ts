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
    source_name: z.string().nullable().default(null),
    tags: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable(),
  })
  .transform(({ content_text, created_at, deleted_at, raw_text, source_url, source_name, updated_at, ...item }) => ({
    ...item,
    contentText: content_text,
    createdAt: created_at,
    deletedAt: deleted_at,
    rawText: raw_text,
    sourceUrl: source_url,
    sourceName: source_name,
    updatedAt: updated_at,
  }));

const junkListSchema = z.object({ items: z.array(junkItemSchema) }).transform(({ items }) => items);

export type JunkItem = z.output<typeof junkItemSchema>;
export type JunkListFilters = { category?: string; q?: string; sourceUrl?: string; tag?: string };
export type CreateJunkInput = Pick<
  JunkItem,
  'category' | 'contentText' | 'sourceUrl' | 'sourceName' | 'tags' | 'title'
>;
export type UpdateJunkInput = Partial<CreateJunkInput>;

const normalizeFilter = (value: string | undefined): string | undefined => value?.trim().toLowerCase();

const toPayload = ({ contentText, sourceUrl, sourceName, ...input }: UpdateJunkInput) => ({
  ...input,
  content_text: contentText,
  source_url: sourceUrl,
  source_name: sourceName,
});

export const getJunkItems = (filters: JunkListFilters, signal?: AbortSignal): Promise<JunkItem[]> =>
  apiRequest(
    `/api/v1/junk${buildQueryString({ category: normalizeFilter(filters.category), q: filters.q, tag: normalizeFilter(filters.tag), source_url: filters.sourceUrl, limit: 100 })}`,
    junkListSchema,
    { signal },
  );

export const getJunkItem = (code: string, signal?: AbortSignal): Promise<JunkItem> =>
  apiRequest(`/api/v1/junk/${encodeURIComponent(code)}`, junkItemSchema, { signal });

export const createJunkItem = (input: CreateJunkInput): Promise<JunkItem> =>
  apiRequest('/api/v1/junk', junkItemSchema, { body: toPayload(input), method: 'POST' });

export const updateJunkItem = (code: string, input: UpdateJunkInput): Promise<JunkItem> =>
  apiRequest(`/api/v1/junk/${encodeURIComponent(code)}`, junkItemSchema, { body: toPayload(input), method: 'PATCH' });

export const deleteJunkItem = (code: string): Promise<void> =>
  apiRequest(`/api/v1/junk/${encodeURIComponent(code)}`, z.undefined(), { method: 'DELETE' });
