import { z } from 'zod';
import { normalizeTags, normalizeTaxonomyValue } from '../../shared/text/taxonomy';
import { noteTypes } from './notes.types';

const nullableTextSchema = z.string().trim().min(1).max(500).nullable();
const sourceNameSchema = z.string().trim().min(1).max(200).nullable();
const sourceUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2_000)
  .refine((value) => URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol))
  .nullable();
const rawTextSchema = z
  .string()
  .max(20_000)
  .refine((value) => value.trim().length > 0)
  .nullable();
const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(50).transform(normalizeTags);
const categorySchema = z.string().trim().min(1).max(100).transform(normalizeTaxonomyValue);

export const createNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    content_text: z.string().trim().min(1).max(20_000),
    raw_text: rawTextSchema.optional().default(null),
    type: z.enum(noteTypes),
    category: categorySchema,
    source_name: sourceNameSchema.optional().default(null),
    source_url: sourceUrlSchema.optional().default(null),
    source_context: nullableTextSchema.optional().default(null),
    source_reference: nullableTextSchema.optional().default(null),
    tags: tagsSchema.optional().default([]),
  })
  .strict();

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    content_text: z.string().trim().min(1).max(20_000).optional(),
    type: z.enum(noteTypes).optional(),
    category: categorySchema.optional(),
    source_name: sourceNameSchema.optional(),
    source_url: sourceUrlSchema.optional(),
    source_context: nullableTextSchema.optional(),
    source_reference: nullableTextSchema.optional(),
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
    tag: z.string().trim().min(1).max(64).transform(normalizeTaxonomyValue).optional(),
    category: categorySchema.optional(),
    source: z.string().trim().min(1).max(200).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (value) => value.from === undefined || value.to === undefined || value.from <= value.to,
    'Invalid date range.',
  );
