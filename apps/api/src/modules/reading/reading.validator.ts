import { z } from 'zod';

const textSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const levelsSchema = z
  .string()
  .transform((value) => value.split(',').map((level) => level.trim()))
  .pipe(z.array(textSchema(32)).min(1).max(20));
const sourceSchema = z.enum(['cron', 'request']);
const questionSchema = z.object({
  question_text: textSchema(20_000),
  expected_answer: textSchema(20_000),
});

export const createMaterialSchema = z.object({
  title: textSchema(300),
  level: textSchema(32).optional(),
  genre: textSchema(100),
  tags: z.array(textSchema(64)).max(50).default([]),
  target_word_count: z.number().int().positive().max(20_000).optional(),
  target_question_count: z.number().int().min(0).max(20).optional(),
  content_text: textSchema(100_000),
  source: sourceSchema,
  questions: z.array(questionSchema).max(20).default([]),
});

export const materialCodeSchema = z.object({
  code: z.string().regex(/^RD-\d{8}-\d{3,}$/),
});

export const listMaterialsSchema = z
  .object({
    q: textSchema(500).optional(),
    reading_status: z.enum(['unread', 'read']).optional(),
    levels: levelsSchema.optional(),
    genre: textSchema(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict();

export const updateMaterialSchema = z.object({ reading_status: z.enum(['unread', 'read']) }).strict();

export const saveAnswersSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            question_number: z.number().int().positive(),
            user_answer: textSchema(20_000).nullable(),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
