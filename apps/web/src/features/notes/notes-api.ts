import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';

const noteTypeSchema = z.enum(['fact', 'personal', 'news', 'quote', 'idea', 'reminder']);

const noteSchema = z
  .object({
    code: z.string(),
    title: z.string(),
    content: z.string(),
    type: noteTypeSchema,
    category: z.string(),
    source: z.string().nullable(),
    source_context: z.string().nullable(),
    source_reference: z.string().nullable(),
    tags: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable(),
  })
  .transform(({ created_at, deleted_at, source_context, source_reference, updated_at, ...note }) => ({
    ...note,
    createdAt: created_at,
    deletedAt: deleted_at,
    sourceContext: source_context,
    sourceReference: source_reference,
    updatedAt: updated_at,
  }));

const noteListSchema = z.object({ items: z.array(noteSchema) }).transform(({ items }) => items);

export type Note = z.output<typeof noteSchema>;
export type NoteType = z.infer<typeof noteTypeSchema>;
export type NoteListFilters = { category?: string; q?: string; tag?: string; type?: NoteType };

export const parseNoteType = (value: string | null): NoteType | undefined => noteTypeSchema.safeParse(value).data;

export const getNotes = (filters: NoteListFilters, signal?: AbortSignal): Promise<Note[]> =>
  apiRequest(`/api/v1/notes${buildQueryString({ ...filters, limit: 100 })}`, noteListSchema, { signal });

export const getNote = (code: string, signal?: AbortSignal): Promise<Note> =>
  apiRequest(`/api/v1/notes/${encodeURIComponent(code)}`, noteSchema, { signal });
