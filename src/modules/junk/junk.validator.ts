import { z } from 'zod';

const nullableTextSchema = z.string().trim().min(1).max(20_000).nullable();
const nullableUrlSchema = z.string().trim().url().max(2_000).nullable();
const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(50);

export const createJunkSchema = z.object({
  title: z.string().trim().min(1).max(300).nullable().optional().default(null),
  category: z.string().trim().min(1).max(100),
  rawText: nullableTextSchema.optional().default(null),
  contentText: nullableTextSchema.optional().default(null),
  sourceUrl: nullableUrlSchema.optional().default(null),
  tags: tagsSchema.optional().default([]),
});

export const updateJunkSchema = z
  .object({
    title: z.string().trim().min(1).max(300).nullable().optional(),
    category: z.string().trim().min(1).max(100).optional(),
    contentText: nullableTextSchema.optional(),
    sourceUrl: nullableUrlSchema.optional(),
    tags: tagsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const junkCodeSchema = z.object({
  code: z.string().regex(/^JK-\d{8}-\d{3,}$/),
});

export const searchJunkSchema = z.object({
  q: z.string().trim().min(1).max(500).optional(),
  tag: z.string().trim().min(1).max(64).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  sourceUrl: z.string().trim().url().max(2_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
