import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';

const noteTypeSchema = z.enum(['fact', 'personal', 'news', 'quote', 'idea', 'reminder']);

const noteSchema = z
  .object({
    code: z.string(),
    title: z.string(),
    content_text: z.string(),
    raw_text: z.string().nullable(),
    type: noteTypeSchema,
    category: z.string(),
    source_name: z.string().nullable(),
    source_url: z.string().url().nullable(),
    source_context: z.string().nullable(),
    source_reference: z.string().nullable(),
    tags: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform(
    ({
      content_text,
      raw_text,
      source_name,
      source_url,
      created_at,
      source_context,
      source_reference,
      updated_at,
      ...note
    }) => ({
      ...note,
      contentText: content_text,
      rawText: raw_text,
      sourceName: source_name,
      sourceUrl: source_url,
      createdAt: created_at,
      sourceContext: source_context,
      sourceReference: source_reference,
      updatedAt: updated_at,
    }),
  );

const noteListSchema = z.object({ items: z.array(noteSchema) }).transform(({ items }) => items);

export type Note = z.output<typeof noteSchema>;
export type NoteType = z.infer<typeof noteTypeSchema>;
export type NoteListFilters = {
  category?: string;
  q?: string;
  tag?: string;
  type?: NoteType;
  source?: string;
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest';
};
export type UpdateNoteInput = Partial<
  Pick<Note, 'category' | 'contentText' | 'sourceName' | 'sourceUrl' | 'tags' | 'title' | 'type'>
>;
export type CreateNoteInput = Pick<
  Note,
  'category' | 'contentText' | 'sourceName' | 'sourceUrl' | 'tags' | 'title' | 'type'
> & { rawText?: string | null };

export const parseNoteType = (value: string | null): NoteType | undefined => noteTypeSchema.safeParse(value).data;

export const getNotes = (filters: NoteListFilters, signal?: AbortSignal): Promise<Note[]> =>
  apiRequest(
    `/api/v1/notes${buildQueryString({ ...filters, category: filters.category?.toLowerCase(), tag: filters.tag?.toLowerCase(), limit: 100 })}`,
    noteListSchema,
    { signal },
  );

export const getNote = (code: string, signal?: AbortSignal): Promise<Note> =>
  apiRequest(`/api/v1/notes/${encodeURIComponent(code)}`, noteSchema, { signal });

const toPayload = ({ contentText, sourceName, sourceUrl, rawText, ...input }: Partial<CreateNoteInput>) => ({
  ...input,
  content_text: contentText,
  source_name: sourceName,
  source_url: sourceUrl,
  raw_text: rawText,
});

export const createNote = (input: CreateNoteInput): Promise<Note> =>
  apiRequest('/api/v1/notes', noteSchema, { body: toPayload(input), method: 'POST' });

export const updateNote = (code: string, input: UpdateNoteInput): Promise<Note> =>
  apiRequest(`/api/v1/notes/${encodeURIComponent(code)}`, noteSchema, { body: toPayload(input), method: 'PATCH' });

export const deleteNote = (code: string): Promise<void> =>
  apiRequest(`/api/v1/notes/${encodeURIComponent(code)}`, z.undefined(), { method: 'DELETE' });
