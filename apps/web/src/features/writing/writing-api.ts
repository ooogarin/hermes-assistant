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
    is_override: z.boolean(),
    source: z.enum(['cron', 'request']),
  })
  .transform(({ is_override, prompt_text, target_word_count, ...material }) => ({
    ...material,
    isOverride: is_override,
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

const adherenceSchema = z
  .object({ status: z.string(), notes: z.string() })
  .transform(({ notes, status }) => ({ notes, status }));

const analysisSchema = z
  .object({
    summary: summarySchema,
    grammar: z.object({ error_count: z.number().int().nonnegative(), items: z.array(grammarItemSchema) }),
    corrected_text: z.string(),
    vocabulary: vocabularySchema,
    structure: z.object({ feedback: z.string(), suggestions: z.array(z.string()) }),
    topic_adherence: adherenceSchema,
    genre_adherence: adherenceSchema,
    next_steps: z.array(z.string()),
  })
  .transform(({ corrected_text, genre_adherence, grammar, next_steps, topic_adherence, ...analysis }) => ({
    ...analysis,
    correctedText: corrected_text,
    genreAdherence: genre_adherence,
    grammar: { errorCount: grammar.error_count, items: grammar.items },
    nextSteps: next_steps,
    topicAdherence: topic_adherence,
  }));

const submissionSchema = z
  .object({
    submission_number: z.number().int().positive(),
    original_text: z.string(),
    word_count: z.number().int().nonnegative(),
    estimated_level: z.string(),
    analysis: analysisSchema,
    submitted_at: z.string(),
  })
  .transform(({ estimated_level, original_text, submission_number, submitted_at, word_count, ...submission }) => ({
    ...submission,
    estimatedLevel: estimated_level,
    originalText: original_text,
    submissionNumber: submission_number,
    submittedAt: submitted_at,
    wordCount: word_count,
  }));

const correctedTextSchema = z
  .object({ submission_number: z.number().int().positive(), corrected_text: z.string() })
  .transform(({ corrected_text, submission_number }) => ({
    correctedText: corrected_text,
    submissionNumber: submission_number,
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
    status: z.enum(['unsubmitted', 'reviewed']),
    submission_count: z.number().int().nonnegative(),
    latest_submission_number: z.number().int().positive().nullable(),
    created_at: z.string(),
  })
  .transform(
    ({ created_at, latest_submission_number, prompt_excerpt, submission_count, target_word_count, ...item }) => ({
      ...item,
      createdAt: created_at,
      latestSubmissionNumber: latest_submission_number,
      promptExcerpt: prompt_excerpt,
      submissionCount: submission_count,
      targetWordCount: target_word_count,
    }),
  );

const paginationSchema = z
  .object({ page: z.number().int(), limit: z.number().int(), total: z.number().int(), total_pages: z.number().int() })
  .transform(({ total_pages, ...meta }) => ({ ...meta, totalPages: total_pages }));

const writingListSchema = z.object({ items: z.array(writingListItemSchema), meta: paginationSchema });

export type WritingSettings = z.output<typeof settingsSchema>;
export type WritingMaterial = z.output<typeof materialSchema>;
export type WritingSubmission = z.output<typeof submissionSchema>;
export type WritingMaterialListItem = z.output<typeof writingListItemSchema>;
export type WritingMaterialList = z.output<typeof writingListSchema>;
export type WritingListFilters = {
  genre?: string;
  level?: string;
  limit?: number;
  page?: number;
  q?: string;
  sort?: 'newest' | 'oldest';
  status?: 'unsubmitted' | 'reviewed';
};

export const getWritingSettings = (signal?: AbortSignal): Promise<WritingSettings> =>
  apiRequest('/api/v1/writing/settings', settingsSchema, { signal });

export const updateWritingSettings = (input: LearningSettingsInput): Promise<WritingSettings> =>
  apiRequest('/api/v1/writing/settings', settingsSchema, { body: input, method: 'PATCH' });

export const getWritingMaterial = (code: string, signal?: AbortSignal): Promise<WritingMaterial> =>
  apiRequest(`/api/v1/writing/materials/${encodeURIComponent(code)}`, materialSchema, { signal });

export const getWritingMaterials = (filters: WritingListFilters, signal?: AbortSignal): Promise<WritingMaterialList> =>
  apiRequest(`/api/v1/writing/materials${buildQueryString(filters)}`, writingListSchema, { signal });

export const getWritingSubmission = (
  code: string,
  submissionNumber: number,
  signal?: AbortSignal,
): Promise<WritingSubmission> =>
  apiRequest(
    `/api/v1/writing/materials/${encodeURIComponent(code)}/submissions/${submissionNumber}`,
    submissionSchema,
    { signal },
  );

export const getCorrectedWriting = (
  code: string,
  submissionNumber: number,
  signal?: AbortSignal,
): Promise<z.output<typeof correctedTextSchema>> =>
  apiRequest(
    `/api/v1/writing/materials/${encodeURIComponent(code)}/submissions/${submissionNumber}/corrected-text`,
    correctedTextSchema,
    { signal },
  );
