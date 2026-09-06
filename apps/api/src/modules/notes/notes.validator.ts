import { z } from 'zod';
import { noteTypes } from './notes.types';

const nullableTextSchema = z.string().trim().min(1).max(500).nullable();
const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(50);

export const createNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    content: z.string().trim().min(1).max(20_000),
    type: z.enum(noteTypes),
    category: z.string().trim().min(1).max(100),
    source: nullableTextSchema.optional().default(null),
    sourceContext: nullableTextSchema.optional().default(null),
    sourceReference: nullableTextSchema.optional().default(null),
    tags: tagsSchema.optional().default([]),
  })
  .strict();

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    content: z.string().trim().min(1).max(20_000).optional(),
    type: z.enum(noteTypes).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    source: nullableTextSchema.optional(),
    sourceContext: nullableTextSchema.optional(),
    sourceReference: nullableTextSchema.optional(),
    tags: tagsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const noteCodeSchema = z
  .object({
    code: z.string().regex(/^NT-\d{8}-\d{3,}$/),
  })
  .strict();

export const searchNotesSchema = z
  .object({
    q: z.string().trim().min(1).max(500).optional(),
    type: z.enum(noteTypes).optional(),
    tag: z.string().trim().min(1).max(64).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
