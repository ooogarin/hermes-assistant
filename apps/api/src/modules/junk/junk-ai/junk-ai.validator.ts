import { z } from 'zod';

export const createJunkWithAiSchema = z
  .object({
    text: z
      .string()
      .max(20_000)
      .refine((value) => value.trim().length > 0, 'Text must not be blank.'),
  })
  .strict();

export const aiJunkMetadataSchema = z
  .object({
    title: z.string().max(300).nullable().default(null),
    category: z.string().max(100),
    content_text: z.string().max(20_000).nullable().default(null),
    source_url: z.string().max(2_000).nullable().default(null),
    source_name: z.string().max(200).nullable().default(null),
    // Overlong tags are dropped during normalization instead of failing the whole draft.
    tags: z.array(z.string().max(200)).max(50).default([]),
  })
  .strict();
