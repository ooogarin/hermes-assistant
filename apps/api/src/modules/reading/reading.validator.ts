import { z } from 'zod';

const textSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const sourceSchema = z.enum(['cron', 'request']);
const questionSchema = z.object({
  question_text: textSchema(20_000),
  expected_answer: textSchema(20_000),
});

export const createMaterialSchema = z.object({
  topic: textSchema(300),
  level: textSchema(32),
  genre: textSchema(100),
  tags: z.array(textSchema(64)).max(50).default([]),
  target_word_count: z.number().int().positive().max(20_000),
  passage_text: textSchema(100_000),
  source: sourceSchema,
  questions: z.array(questionSchema).min(3).max(5),
});

export const materialCodeSchema = z.object({
  code: z.string().regex(/^RD-\d{8}-\d{3,}$/),
});

export const listMaterialsSchema = z
  .object({
    q: textSchema(500).optional(),
    status: z.enum(['unanswered', 'completed']).optional(),
    level: textSchema(32).optional(),
    genre: textSchema(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict();

export const saveSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        question_number: z.number().int().positive(),
        user_answer: textSchema(20_000),
      }),
    )
    .min(1)
    .max(5),
});

export const updateSettingsSchema = z
  .object({
    default_level: textSchema(32).optional(),
    default_word_count: z.number().int().positive().max(20_000).optional(),
    min_word_count: z.number().int().positive().max(20_000).optional(),
    max_word_count: z.number().int().positive().max(20_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
