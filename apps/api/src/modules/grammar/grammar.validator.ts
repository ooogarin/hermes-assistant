import { z } from 'zod';

const grammarModeSchema = z.enum(['practice', 'exam']);
const grammarSourceSchema = z.enum(['cron', 'request']);
const answerResultSchema = z.enum(['correct', 'partial', 'incorrect']);
const textSchema = z.string().trim().min(1).max(20_000);

const questionSchema = z
  .object({
    question_type: z.string().trim().min(1).max(100),
    grammar_area: z.string().trim().min(1).max(100),
    grammar_point: z.string().trim().min(1).max(200),
    level: z.string().trim().min(1).max(32),
    question_text: textSchema,
    correct_answer: textSchema,
    explanation: textSchema,
  })
  .strict();

export const createSessionSchema = z
  .object({
    mode: grammarModeSchema,
    source: grammarSourceSchema,
    level: z.string().trim().min(1).max(32),
    questions: z.array(questionSchema).min(1).max(100),
  })
  .strict();

export const sessionCodeSchema = z.object({
  code: z.string().regex(/^GR-\d{8}-\d{3,}$/),
});

export const questionReferenceSchema = sessionCodeSchema.extend({
  question_number: z.coerce.number().int().positive(),
});

export const listSessionsSchema = z
  .object({
    q: z.string().trim().min(1).max(500).optional(),
    status: z.enum(['active', 'completed', 'abandoned']).optional(),
    mode: grammarModeSchema.optional(),
    level: z.string().trim().min(1).max(32).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strict();

export const saveAnswersSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            question_number: z.number().int().positive(),
            user_answer: textSchema,
            result: answerResultSchema.optional(),
            feedback: z.string().trim().min(1).max(2_000).nullable().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    value.answers.forEach((answer, index) => {
      if (answer.result === undefined && answer.feedback !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Feedback requires an evaluation result.',
          path: ['answers', index, 'feedback'],
        });
      }
    });
  });

export const evaluateSessionSchema = z
  .object({
    answers: z
      .array(
        z
          .object({
            question_number: z.number().int().positive(),
            result: answerResultSchema,
            feedback: z.string().trim().min(1).max(2_000).nullable().optional().default(null),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
