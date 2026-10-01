import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';

const readingSettingsSchema = z
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

const readingQuestionSchema = z
  .object({
    question_number: z.number().int().positive(),
    question_text: z.string(),
    user_answer: z.string().nullable(),
  })
  .transform(({ question_number, question_text, user_answer }) => ({
    questionNumber: question_number,
    questionText: question_text,
    userAnswer: user_answer,
  }));

const readingMaterialSchema = z
  .object({
    code: z.string(),
    title: z.string(),
    level: z.string(),
    genre: z.string(),
    tags: z.array(z.string()),
    target_word_count: z.number().int().positive(),
    word_count: z.number().int().nonnegative(),
    content_text: z.string(),
    is_override: z.boolean(),
    source: z.enum(['cron', 'request']),
    questions: z.array(readingQuestionSchema),
  })
  .transform(({ is_override, content_text, target_word_count, word_count, ...material }) => ({
    ...material,
    isOverride: is_override,
    contentText: content_text,
    targetWordCount: target_word_count,
    wordCount: word_count,
  }));

const expectedAnswerSchema = z
  .object({
    question_number: z.number().int().positive(),
    question_text: z.string(),
    expected_answer: z.string(),
  })
  .transform(({ expected_answer, question_number, question_text }) => ({
    expectedAnswer: expected_answer,
    questionNumber: question_number,
    questionText: question_text,
  }));

const expectedAnswersSchema = z.object({ items: z.array(expectedAnswerSchema) }).transform(({ items }) => items);

const readingListItemSchema = z
  .object({
    code: z.string(),
    title: z.string(),
    genre: z.string(),
    level: z.string(),
    target_word_count: z.number().int().positive(),
    word_count: z.number().int().nonnegative(),
    tags: z.array(z.string()),
    source: z.enum(['cron', 'request']),
    status: z.enum(['unanswered', 'completed']),
    question_count: z.number().int().nonnegative(),
    answered_question_count: z.number().int().nonnegative(),
    created_at: z.string(),
  })
  .transform(({ answered_question_count, created_at, question_count, target_word_count, word_count, ...item }) => ({
    ...item,
    answeredQuestionCount: answered_question_count,
    createdAt: created_at,
    questionCount: question_count,
    targetWordCount: target_word_count,
    wordCount: word_count,
  }));

const paginationSchema = z
  .object({ page: z.number().int(), limit: z.number().int(), total: z.number().int(), total_pages: z.number().int() })
  .transform(({ total_pages, ...meta }) => ({ ...meta, totalPages: total_pages }));

const readingListSchema = z.object({ items: z.array(readingListItemSchema), meta: paginationSchema });

export type ReadingSettings = z.output<typeof readingSettingsSchema>;
export type ReadingMaterial = z.output<typeof readingMaterialSchema>;
export type ReadingExpectedAnswer = z.output<typeof expectedAnswerSchema>;
export type ReadingMaterialListItem = z.output<typeof readingListItemSchema>;
export type ReadingMaterialList = z.output<typeof readingListSchema>;
export type ReadingListFilters = {
  genre?: string;
  levels?: string[];
  limit?: number;
  page?: number;
  q?: string;
  sort?: 'newest' | 'oldest';
  status?: 'unanswered' | 'completed';
};
export type ReadingSettingsInput = Pick<
  ReadingSettings,
  'defaultLevel' | 'defaultWordCount' | 'minWordCount' | 'maxWordCount'
>;

export const getReadingSettings = (signal?: AbortSignal): Promise<ReadingSettings> =>
  apiRequest('/api/v1/reading/settings', readingSettingsSchema, { signal });

export const updateReadingSettings = (input: ReadingSettingsInput): Promise<ReadingSettings> =>
  apiRequest('/api/v1/reading/settings', readingSettingsSchema, { body: input, method: 'PATCH' });

export const getReadingMaterial = (code: string, signal?: AbortSignal): Promise<ReadingMaterial> =>
  apiRequest(`/api/v1/reading/materials/${encodeURIComponent(code)}`, readingMaterialSchema, { signal });

export const getReadingMaterials = (
  filters: ReadingListFilters,
  signal?: AbortSignal,
): Promise<ReadingMaterialList> => {
  const { levels, ...query } = filters;
  return apiRequest(
    `/api/v1/reading/materials${buildQueryString({ ...query, levels: levels?.join(',') })}`,
    readingListSchema,
    { signal },
  );
};

export const submitReadingAnswers = (
  code: string,
  answers: Array<{ questionNumber: number; userAnswer: string }>,
): Promise<ReadingMaterial> =>
  apiRequest(`/api/v1/reading/materials/${encodeURIComponent(code)}/submissions`, readingMaterialSchema, {
    body: { answers },
    method: 'POST',
  });

export const getReadingExpectedAnswers = (code: string, signal?: AbortSignal): Promise<ReadingExpectedAnswer[]> =>
  apiRequest(`/api/v1/reading/materials/${encodeURIComponent(code)}/expected-answers`, expectedAnswersSchema, {
    signal,
  });
