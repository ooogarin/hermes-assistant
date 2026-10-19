import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    default_level: z.string().trim().min(1).max(32).optional(),
    default_word_count: z.number().int().positive().max(20_000).optional(),
    min_word_count: z.number().int().positive().max(20_000).optional(),
    max_word_count: z.number().int().positive().max(20_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
