import { z } from 'zod';
import { normalizeTags, normalizeTaxonomyValue } from '../../shared/text/taxonomy';

const nullableTextSchema = z.string().trim().min(1).max(20_000).nullable();
const rawTextSchema = z
  .string()
  .max(20_000)
  .refine((value) => value.trim().length > 0)
  .nullable();
const urlSchema = z
  .string()
  .trim()
  .url()
  .max(2_000)
  .refine((value) => URL.canParse(value) && ['http:', 'https:'].includes(new URL(value).protocol));
const nullableUrlSchema = urlSchema.nullable();
const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(50).transform(normalizeTags);
const sourceNameSchema = z.string().trim().min(1).max(200).nullable();

export const createJunkSchema = z
  .object({
    title: z.string().trim().min(1).max(300).nullable().optional().default(null),
    category: z.string().trim().min(1).max(100).transform(normalizeTaxonomyValue),
    raw_text: rawTextSchema.optional().default(null),
    content_text: nullableTextSchema.optional().default(null),
    source_url: nullableUrlSchema.optional().default(null),
    source_name: sourceNameSchema.optional().default(null),
    tags: tagsSchema.optional().default([]),
  })
  .strict()
  .refine(
    (value) => [value.title, value.raw_text, value.content_text, value.source_url].some((field) => field !== null),
    'At least one of title, raw_text, content_text, or source_url is required.',
  );

export const updateJunkSchema = z
  .object({
    title: z.string().trim().min(1).max(300).nullable().optional(),
    category: z.string().trim().min(1).max(100).transform(normalizeTaxonomyValue).optional(),
    content_text: nullableTextSchema.optional(),
    source_url: nullableUrlSchema.optional(),
    source_name: sourceNameSchema.optional(),
    tags: tagsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const junkCodeSchema = z
  .object({
    code: z.string().regex(/^JK-\d{8}-\d{3,}$/),
  })
  .strict();

export const searchJunkSchema = z
  .object({
    q: z.string().trim().min(1).max(500).optional(),
    tag: z.string().trim().min(1).max(64).transform(normalizeTaxonomyValue).optional(),
    category: z.string().trim().min(1).max(100).transform(normalizeTaxonomyValue).optional(),
    source_url: urlSchema.optional(),
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
