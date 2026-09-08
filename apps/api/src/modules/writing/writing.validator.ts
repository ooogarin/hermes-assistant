import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const levels = z
  .string()
  .transform((value) => value.split(',').map((level) => level.trim()))
  .pipe(z.array(text(32)).min(1).max(20));
const source = z.enum(['cron', 'request']);
const adherence = z.enum(['aligned', 'partially_aligned', 'off_topic']);
const genre_adherence = z.enum(['aligned', 'partially_aligned', 'not_aligned']);

export const analysisSchema = z.object({
  summary: z.object({
    overall_feedback: text(5000),
    strengths: z.array(text(500)),
    priority_improvements: z.array(text(500)),
  }),
  grammar: z.object({
    error_count: z.number().int().nonnegative(),
    items: z.array(
      z.object({
        original: text(2_000),
        corrected: text(2_000),
        error_type: text(100),
        explanation: text(2_000),
      }),
    ),
  }),
  corrected_text: text(100000),
  vocabulary: z.object({
    repeated_words: z.array(
      z.object({
        word: text(100),
        count: z.number().int().positive(),
        suggestions: z.array(text(200)),
      }),
    ),
    better_phrases: z.array(
      z.object({
        original: text(500),
        suggestions: z.array(text(500)),
      }),
    ),
    new_useful_words: z.array(
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
  topic_adherence: z.object({
    status: adherence,
    notes: text(2_000),
  }),
  genre_adherence: z.object({
    status: genre_adherence,
    notes: text(2_000),
  }),
  next_steps: z.array(text(1_000)),
});

export const createMaterialSchema = z.object({
  topic: text(300),
  prompt_text: text(20_000),
  level: text(32),
  genre: text(100),
  tags: z.array(text(64)).max(50).default([]),
  target_word_count: z.number().int().positive().max(20_000),
  source,
});

export const materialCodeSchema = z.object({
  code: z.string().regex(/^WR-\d{8}-\d{3,}$/),
});

export const listMaterialsSchema = z
  .object({
    q: text(500).optional(),
    status: z.enum(['unsubmitted', 'reviewed']).optional(),
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

export const submissionParamsSchema = materialCodeSchema.extend({
  submission_number: z.coerce.number().int().positive(),
});

export const createSubmissionSchema = z.object({
  original_text: text(100_000),
  estimated_level: text(32),
  analysis: analysisSchema,
});

export const updateSettingsSchema = z
  .object({
    default_level: text(32).optional(),
    default_word_count: z.number().int().positive().max(20_000).optional(),
    min_word_count: z.number().int().positive().max(20_000).optional(),
    max_word_count: z.number().int().positive().max(20_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');
