import { z } from 'zod';

const nullableTextSchema = z.string().trim().min(1).max(20_000).nullable();
const nullableUrlSchema = z.string().trim().url().max(2_000).nullable();
const tagsSchema = z
  .array(z.string().trim().min(1).max(64))
  .max(50)
  .transform((tags) => tags.map((tag) => tag.toLowerCase()));
const sourceNameSchema = z.string().trim().min(1).max(200).nullable();

export const createJunkSchema = z
  .object({
    title: z.string().trim().min(1).max(300).nullable().optional().default(null),
    category: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform((category) => category.toLowerCase()),
    raw_text: nullableTextSchema.optional().default(null),
    content_text: nullableTextSchema.optional().default(null),
    source_url: nullableUrlSchema.optional().default(null),
    source_name: sourceNameSchema.optional().default(null),
    tags: tagsSchema.optional().default([]),
  })
  .strict();

export const updateJunkSchema = z
  .object({
    title: z.string().trim().min(1).max(300).nullable().optional(),
    category: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform((category) => category.toLowerCase())
      .optional(),
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
    tag: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .transform((tag) => tag.toLowerCase())
      .optional(),
    category: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .transform((category) => category.toLowerCase())
      .optional(),
    source_url: z.string().trim().url().max(2_000).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
