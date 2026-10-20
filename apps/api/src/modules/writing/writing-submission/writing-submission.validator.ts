import { z } from 'zod';
import { writingMaterialCodeSchema, writingSubmissionCodeSchema } from '../../../shared/code/public-code';
import { normalizeTaxonomyValue } from '../../../shared/text/taxonomy';

const text = (max: number) => z.string().trim().min(1).max(max);
const materialCode = writingMaterialCodeSchema;

// Validate blank text without trimming: formatting is part of the user's original draft.
const originalText = z
  .string()
  .max(100_000)
  .refine((value) => /\S/.test(value), { message: 'Text must not be blank.' });
const estimatedMetadata = {
  estimated_topic: text(300),
  estimated_genre: text(100).transform(normalizeTaxonomyValue),
  estimated_tags: z.array(text(64)).max(50),
  estimated_level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
};

export const analysisSchema = z
  .strictObject({
    summary: z.strictObject({
      overall_feedback: text(5000),
      strengths: z.array(text(500)),
      priority_improvements: z.array(text(500)),
    }),
    grammar: z.strictObject({
      error_count: z.number().int().nonnegative(),
      items: z.array(
        z.strictObject({
          original: text(2_000),
          corrected: text(2_000),
          error_type: text(100),
          explanation: text(2_000),
        }),
      ),
    }),
    corrected_text: text(100000),
    vocabulary: z.strictObject({
      repeated_words: z.array(
        z.strictObject({
          word: text(100),
          count: z.number().int().positive(),
          suggestions: z.array(text(200)),
        }),
      ),
      better_phrases: z.array(
        z.strictObject({
          original: text(500),
          suggestions: z.array(text(500)),
        }),
      ),
      new_useful_words: z.array(
        z.strictObject({
          word: text(100),
          meaning: text(500),
          example: text(1_000),
        }),
      ),
    }),
    structure: z.strictObject({
      feedback: text(5_000),
      suggestions: z.array(text(1_000)),
    }),
    prompt_adherence: z
      .strictObject({
        status: z.enum(['aligned', 'partially_aligned', 'not_aligned']),
        notes: text(2_000),
      })
      .nullable(),
    next_steps: z.array(text(1_000)),
  })
  .refine(({ grammar }) => grammar.error_count === grammar.items.length, {
    message: 'Grammar error count must match the correction items.',
    path: ['grammar', 'error_count'],
  });

export const submissionParamsSchema = z.strictObject({
  code: writingSubmissionCodeSchema,
});

export const createSubmissionSchema = z.strictObject({
  material_code: materialCode.nullable().optional(),
  original_text: originalText,
});

export const updateSubmissionSchema = z
  .strictObject({
    original_text: originalText.optional(),
    estimated_topic: estimatedMetadata.estimated_topic.optional(),
    estimated_genre: estimatedMetadata.estimated_genre.optional(),
    estimated_tags: estimatedMetadata.estimated_tags.optional(),
    estimated_level: estimatedMetadata.estimated_level.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'At least one editable field is required.',
  });

export const saveAnalysisSchema = z.strictObject({
  ...estimatedMetadata,
  analysis: analysisSchema,
});

export const listSubmissionsSchema = z
  .strictObject({
    q: text(500).optional(),
    material_code: materialCode.optional(),
    writing_type: z.enum(['free', 'prompted']).optional(),
    analysis_status: z.enum(['not_analyzed', 'analyzed']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .refine(({ material_code, writing_type }) => material_code === undefined || writing_type !== 'free', {
    message: 'Free writing cannot have a material filter.',
    path: ['material_code'],
  });
