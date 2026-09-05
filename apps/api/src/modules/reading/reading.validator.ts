import { z } from 'zod';

const textSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const sourceSchema = z.enum(['cron', 'request']);
const questionSchema = z.object({
  questionText: textSchema(20_000),
  expectedAnswer: textSchema(20_000),
});

export const createMaterialSchema = z.object({
  topic: textSchema(300),
  level: textSchema(32),
  genre: textSchema(100),
  tags: z.array(textSchema(64)).max(50).default([]),
  targetWordCount: z.number().int().positive().max(20_000),
  passageText: textSchema(100_000),
  source: sourceSchema,
  questions: z.array(questionSchema).min(3).max(5),
});

export const materialCodeSchema = z.object({
  code: z.string().regex(/^RD-\d{8}-\d{3,}$/),
});

export const saveSubmissionSchema = z.object({
  answers: z
    .array(
      z.object({
        questionNumber: z.number().int().positive(),
        userAnswer: textSchema(20_000),
      }),
    )
    .min(1)
    .max(5),
});

export const updateSettingsSchema = z
  .object({
    defaultLevel: textSchema(32).optional(),
    defaultWordCount: z.number().int().positive().max(20_000).optional(),
    minWordCount: z.number().int().positive().max(20_000).optional(),
    maxWordCount: z.number().int().positive().max(20_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
