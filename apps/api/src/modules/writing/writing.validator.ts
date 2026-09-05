import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const source = z.enum(['cron', 'request']);
const adherence = z.enum(['aligned', 'partially_aligned', 'off_topic']);
const genreAdherence = z.enum(['aligned', 'partially_aligned', 'not_aligned']);

export const analysisSchema = z.object({
  summary: z.object({
    overallFeedback: text(5000),
    strengths: z.array(text(500)),
    priorityImprovements: z.array(text(500)),
  }),
  grammar: z.object({
    errorCount: z.number().int().nonnegative(),
    items: z.array(
      z.object({
        original: text(2_000),
        corrected: text(2_000),
        errorType: text(100),
        explanation: text(2_000),
      }),
    ),
  }),
  correctedText: text(100000),
  vocabulary: z.object({
    repeatedWords: z.array(
      z.object({
        word: text(100),
        count: z.number().int().positive(),
        suggestions: z.array(text(200)),
      }),
    ),
    betterPhrases: z.array(
      z.object({
        original: text(500),
        suggestions: z.array(text(500)),
      }),
    ),
    newUsefulWords: z.array(
      z.object({
        word: text(100),
        meaning: text(500),
        example: text(1_000),
      }),
    ),
  }),
  structure: z.object({
    feedback: text(5_000),
    suggestions: z.array(text(1_000)),
  }),
  topicAdherence: z.object({
    status: adherence,
    notes: text(2_000),
  }),
  genreAdherence: z.object({
    status: genreAdherence,
    notes: text(2_000),
  }),
  nextSteps: z.array(text(1_000)),
});

export const createMaterialSchema = z.object({
  topic: text(300),
  promptText: text(20_000),
  level: text(32),
  genre: text(100),
  tags: z.array(text(64)).max(50).default([]),
  targetWordCount: z.number().int().positive().max(20_000),
  source,
});

export const materialCodeSchema = z.object({
  code: z.string().regex(/^WR-\d{8}-\d{3,}$/),
});

export const submissionParamsSchema = materialCodeSchema.extend({
  submissionNumber: z.coerce.number().int().positive(),
});

export const createSubmissionSchema = z.object({
  originalText: text(100_000),
  estimatedLevel: text(32),
  analysis: analysisSchema,
});

export const updateSettingsSchema = z
  .object({
    defaultLevel: text(32).optional(),
    defaultWordCount: z.number().int().positive().max(20_000).optional(),
    minWordCount: z.number().int().positive().max(20_000).optional(),
    maxWordCount: z.number().int().positive().max(20_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
