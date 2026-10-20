import { z } from 'zod';
import { writingMaterialCodeSchema } from '../../../shared/code/public-code';

const text = (max: number) => z.string().trim().min(1).max(max);
const levels = z
  .string()
  .transform((value) => value.split(',').map((level) => level.trim()))
  .pipe(z.array(text(32)).min(1).max(20));
const source = z.enum(['cron', 'request']);
const materialCode = writingMaterialCodeSchema;

export const createMaterialSchema = z.strictObject({
  topic: text(300),
  prompt_text: text(20_000),
  level: text(32),
  genre: text(100),
  tags: z.array(text(64)).max(50).default([]),
  target_word_count: z.number().int().positive().max(20_000),
  source,
});

export const materialCodeSchema = z.strictObject({
  code: materialCode,
});

export const listMaterialsSchema = z
  .object({
    q: text(500).optional(),
    status: z.enum(['unsubmitted', 'submitted', 'reviewed']).optional(),
    level: text(32).optional(),
    levels: levels.optional(),
    genre: text(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict()
  .refine(({ level, levels }) => level === undefined || levels === undefined, {
    message: 'Use either level or levels, not both.',
    path: ['levels'],
  })
  .transform(({ level, levels, ...query }) => {
    const selectedLevels = levels ?? (level === undefined ? undefined : [level]);

    return selectedLevels === undefined ? query : { ...query, levels: selectedLevels };
  });
