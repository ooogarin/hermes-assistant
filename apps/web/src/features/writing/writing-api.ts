import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';
import type { LearningSettingsInput } from '../../components/english/learning-settings';

const settingsSchema = z
  .object({
    default_level: z.string(),
    default_word_count: z.number().int().positive(),
    min_word_count: z.number().int().positive(),
    max_word_count: z.number().int().positive(),
    updated_at: z.string(),
  })
  .transform(({ default_level, default_word_count, max_word_count, min_word_count, updated_at }) => ({
    defaultLevel: default_level,
    defaultWordCount: default_word_count,
    maxWordCount: max_word_count,
    minWordCount: min_word_count,
    updatedAt: updated_at,
  }));

const materialSchema = z
  .object({
    code: z.string(),
    topic: z.string(),
    prompt_text: z.string(),
    level: z.string(),
    genre: z.string(),
    tags: z.array(z.string()),
    target_word_count: z.number().int().positive(),
    source: z.enum(['cron', 'request']),
  })
  .transform(({ prompt_text, target_word_count, ...material }) => ({
    ...material,
    promptText: prompt_text,
    targetWordCount: target_word_count,
  }));

const summarySchema = z
  .object({
    overall_feedback: z.string(),
    strengths: z.array(z.string()),
    priority_improvements: z.array(z.string()),
  })
  .transform(({ overall_feedback, priority_improvements, strengths }) => ({
    overallFeedback: overall_feedback,
    priorityImprovements: priority_improvements,
    strengths,
  }));

const grammarItemSchema = z
  .object({
    original: z.string(),
    corrected: z.string(),
    error_type: z.string(),
    explanation: z.string(),
  })
  .transform(({ error_type, ...item }) => ({ ...item, errorType: error_type }));

const vocabularySchema = z
  .object({
    repeated_words: z.array(z.object({ word: z.string(), count: z.number().int(), suggestions: z.array(z.string()) })),
    better_phrases: z.array(z.object({ original: z.string(), suggestions: z.array(z.string()) })),
    new_useful_words: z.array(z.object({ word: z.string(), meaning: z.string(), example: z.string() })),
  })
  .transform(({ better_phrases, new_useful_words, repeated_words }) => ({
    betterPhrases: better_phrases,
    newUsefulWords: new_useful_words,
    repeatedWords: repeated_words,
  }));

const adherenceSchema = z.object({
  status: z.enum(['aligned', 'partially_aligned', 'not_aligned']),
  notes: z.string(),
});

const analysisSchema = z
  .object({
    summary: summarySchema,
    grammar: z.object({ error_count: z.number().int().nonnegative(), items: z.array(grammarItemSchema) }),
    corrected_text: z.string(),
    vocabulary: vocabularySchema,
    structure: z.object({ feedback: z.string(), suggestions: z.array(z.string()) }),
    prompt_adherence: adherenceSchema.nullable(),
    next_steps: z.array(z.string()),
  })
  .transform(({ corrected_text, grammar, next_steps, prompt_adherence, ...analysis }) => ({
    ...analysis,
    correctedText: corrected_text,
    grammar: { errorCount: grammar.error_count, items: grammar.items },
    nextSteps: next_steps,
    promptAdherence: prompt_adherence,
  }));

const submissionFields = {
  code: z.string(),
  material_code: z.string().nullable(),
  word_count: z.number().int().nonnegative(),
  estimated_topic: z.string().nullable(),
  estimated_genre: z.string().nullable(),
  estimated_tags: z.array(z.string()).nullable(),
  estimated_level: z.string().nullable(),
  analysis_status: z.enum(['not_analyzed', 'analyzed']),
  created_at: z.string(),
  updated_at: z.string(),
};

const mapSubmissionMetadata = (submission: z.infer<z.ZodObject<typeof submissionFields>>) => ({
  code: submission.code,
  materialCode: submission.material_code,
  wordCount: submission.word_count,
  estimatedTopic: submission.estimated_topic,
  estimatedGenre: submission.estimated_genre,
  estimatedTags: submission.estimated_tags,
  estimatedLevel: submission.estimated_level,
  analysisStatus: submission.analysis_status,
  createdAt: submission.created_at,
  updatedAt: submission.updated_at,
});

const submissionSchema = z
  .object({
    ...submissionFields,
    original_text: z.string(),
    analysis: analysisSchema.nullable(),
    analyzed_at: z.string().nullable(),
  })
  .transform((submission) => ({
    ...mapSubmissionMetadata(submission),
    analysis: submission.analysis,
    analyzedAt: submission.analyzed_at,
    originalText: submission.original_text,
  }));

const submissionListItemSchema = z
  .object({ ...submissionFields, text_excerpt: z.string() })
  .transform((submission) => ({ ...mapSubmissionMetadata(submission), textExcerpt: submission.text_excerpt }));

const correctedTextSchema = z
  .object({ code: z.string(), corrected_text: z.string() })
  .transform(({ corrected_text, code }) => ({
    code,
    correctedText: corrected_text,
  }));

const writingListItemSchema = z
  .object({
    code: z.string(),
    topic: z.string(),
    prompt_excerpt: z.string(),
    genre: z.string(),
    level: z.string(),
    target_word_count: z.number().int().positive(),
    tags: z.array(z.string()),
    source: z.enum(['cron', 'request']),
    status: z.enum(['unsubmitted', 'submitted', 'reviewed']),
    submission_count: z.number().int().nonnegative(),
    analyzed_submission_count: z.number().int().nonnegative(),
    unanalyzed_submission_count: z.number().int().nonnegative(),
    latest_submission_code: z.string().nullable(),
    created_at: z.string(),
  })
  .transform(
    ({
      created_at,
      latest_submission_code,
      prompt_excerpt,
      submission_count,
      target_word_count,
      analyzed_submission_count,
      unanalyzed_submission_count,
      ...item
    }) => ({
      ...item,
      createdAt: created_at,
      latestSubmissionCode: latest_submission_code,
      analyzedSubmissionCount: analyzed_submission_count,
      unanalyzedSubmissionCount: unanalyzed_submission_count,
      promptExcerpt: prompt_excerpt,
      submissionCount: submission_count,
      targetWordCount: target_word_count,
    }),
  );

const paginationSchema = z
  .object({ page: z.number().int(), limit: z.number().int(), total: z.number().int(), total_pages: z.number().int() })
  .transform(({ total_pages, ...meta }) => ({ ...meta, totalPages: total_pages }));

const writingListSchema = z.object({ items: z.array(writingListItemSchema), meta: paginationSchema });
const submissionListSchema = z.object({ items: z.array(submissionListItemSchema), meta: paginationSchema });

export type WritingSettings = z.output<typeof settingsSchema>;
export type WritingMaterial = z.output<typeof materialSchema>;
export type WritingSubmission = z.output<typeof submissionSchema>;
export type WritingAnalysis = z.output<typeof analysisSchema>;
export type WritingSubmissionListItem = z.output<typeof submissionListItemSchema>;
export type WritingMaterialListItem = z.output<typeof writingListItemSchema>;
export type WritingMaterialList = z.output<typeof writingListSchema>;
export type WritingListFilters = {
  genre?: string;
  levels?: string[];
  limit?: number;
  page?: number;
  q?: string;
  sort?: 'newest' | 'oldest';
  status?: 'unsubmitted' | 'submitted' | 'reviewed';
};

export type WritingSubmissionFilters = {
  materialCode?: string;
  writingType?: 'free' | 'prompted';
  analysisStatus?: 'not_analyzed' | 'analyzed';
  q?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest';
};

export type UpdateWritingSubmissionInput = {
  originalText?: string;
  estimatedTopic?: string;
  estimatedGenre?: string;
  estimatedTags?: string[];
  estimatedLevel?: string;
};

export const getWritingSettings = (signal?: AbortSignal): Promise<WritingSettings> =>
  apiRequest('/api/v1/writing/settings', settingsSchema, { signal });

export const updateWritingSettings = (input: LearningSettingsInput): Promise<WritingSettings> =>
  apiRequest('/api/v1/writing/settings', settingsSchema, {
    method: 'PATCH',
    body: {
      default_level: input.defaultLevel,
      default_word_count: input.defaultWordCount,
      min_word_count: input.minWordCount,
      max_word_count: input.maxWordCount,
    },
  });

export const getWritingMaterial = (code: string, signal?: AbortSignal): Promise<WritingMaterial> =>
  apiRequest(`/api/v1/writing/materials/${encodeURIComponent(code)}`, materialSchema, { signal });

export const getWritingMaterials = (
  filters: WritingListFilters,
  signal?: AbortSignal,
): Promise<WritingMaterialList> => {
  const { levels, ...query } = filters;
  return apiRequest(
    `/api/v1/writing/materials${buildQueryString({ ...query, levels: levels?.join(',') })}`,
    writingListSchema,
    { signal },
  );
};

export const getWritingSubmission = (code: string, signal?: AbortSignal): Promise<WritingSubmission> =>
  apiRequest(`/api/v1/writing/submissions/${encodeURIComponent(code)}`, submissionSchema, { signal });

export const getWritingSubmissions = (filters: WritingSubmissionFilters, signal?: AbortSignal) => {
  const { materialCode, writingType, analysisStatus, ...query } = filters;

  return apiRequest(
    `/api/v1/writing/submissions${buildQueryString({
      ...query,
      material_code: materialCode,
      writing_type: writingType,
      analysis_status: analysisStatus,
    })}`,
    submissionListSchema,
    { signal },
  );
};

// Collections show every matching item; pagination stays inside the API transport.
const collectWritingPages = async <Item>(
  loadPage: (page: number) => Promise<{ items: Item[]; meta: { totalPages: number } }>,
): Promise<Item[]> => {
  const firstPage = await loadPage(1);
  const items = [...firstPage.items];

  for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
    const nextPage = await loadPage(page);
    items.push(...nextPage.items);
  }

  return items;
};

export const getAllWritingMaterials = (
  filters: Omit<WritingListFilters, 'page' | 'limit'>,
  signal?: AbortSignal,
): Promise<WritingMaterialListItem[]> =>
  collectWritingPages((page) => getWritingMaterials({ ...filters, page, limit: 100 }, signal));

export const getAllWritingSubmissions = (
  filters: Omit<WritingSubmissionFilters, 'page' | 'limit'>,
  signal?: AbortSignal,
): Promise<WritingSubmissionListItem[]> =>
  collectWritingPages((page) => getWritingSubmissions({ ...filters, page, limit: 100 }, signal));

export const createWritingSubmission = (originalText: string, materialCode?: string): Promise<WritingSubmission> =>
  apiRequest('/api/v1/writing/submissions', submissionSchema, {
    method: 'POST',
    body: { original_text: originalText, material_code: materialCode },
  });

export const updateWritingSubmission = (
  code: string,
  input: UpdateWritingSubmissionInput,
): Promise<WritingSubmission> =>
  apiRequest(`/api/v1/writing/submissions/${encodeURIComponent(code)}`, submissionSchema, {
    method: 'PATCH',
    body: {
      original_text: input.originalText,
      estimated_topic: input.estimatedTopic,
      estimated_genre: input.estimatedGenre,
      estimated_tags: input.estimatedTags,
      estimated_level: input.estimatedLevel,
    },
  });

export const getCorrectedWriting = (
  code: string,
  signal?: AbortSignal,
): Promise<z.output<typeof correctedTextSchema>> =>
  apiRequest(`/api/v1/writing/submissions/${encodeURIComponent(code)}/corrected-text`, correctedTextSchema, { signal });
