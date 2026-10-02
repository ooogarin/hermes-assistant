import { z } from 'zod';

export const listCategoriesSchema = z
  .object({
    type: z.enum(['expense', 'income']).optional(),
  })
  .strict();
