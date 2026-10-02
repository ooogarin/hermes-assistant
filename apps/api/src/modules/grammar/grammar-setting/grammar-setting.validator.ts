import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    default_level: z.string().trim().min(1).max(32).optional(),
    daily_question_count: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
