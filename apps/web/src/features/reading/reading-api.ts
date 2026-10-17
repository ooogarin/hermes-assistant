import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';

const readingSettingsSchema = z
  .object({
    default_level: z.string(),
    default_word_count: z.number().int().positive(),
    default_question_count: z.number().int().min(0).max(20),
    min_word_count: z.number().int().positive(),
    max_word_count: z.number().int().positive(),
    updated_at: z.string(),
  })
  .transform(
    ({ default_level, default_word_count, default_question_count, max_word_count, min_word_count, updated_at }) => ({
      defaultLevel: default_level,
      defaultWordCount: default_word_count,
      defaultQuestionCount: default_question_count,
      maxWordCount: max_word_count,
      minWordCount: min_word_count,
      updatedAt: updated_at,
    }),
  );

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
    reading_status: z.enum(['unread', 'read']),
    created_at: z.string(),
    updated_at: z.string(),
    word_count: z.number().int().nonnegative(),
    content_text: z.string(),
    is_override: z.boolean(),
    source: z.enum(['cron', 'request']),
    questions: z.array(readingQuestionSchema),
  })
  .transform(({ is_override, content_text, reading_status, created_at, updated_at, word_count, ...material }) => ({
    ...material,
    isOverride: is_override,
    contentText: content_text,
    readingStatus: reading_status,
    createdAt: created_at,
    updatedAt: updated_at,
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
    content_excerpt: z.string(),
    genre: z.string(),
    level: z.string(),
    tags: z.array(z.string()),
    reading_status: z.enum(['unread', 'read']),
    created_at: z.string(),
  })
  .transform(({ content_excerpt, reading_status, created_at, ...item }) => ({
    ...item,
    contentExcerpt: content_excerpt,
    readingStatus: reading_status,
    createdAt: created_at,
  }));
const readingListSchema = z.object({ items: z.array(readingListItemSchema) });

export type ReadingSettings = z.output<typeof readingSettingsSchema>;
export type ReadingMaterial = z.output<typeof readingMaterialSchema>;
export type ReadingExpectedAnswer = z.output<typeof expectedAnswerSchema>;
export type ReadingMaterialListItem = z.output<typeof readingListItemSchema>;
export type ReadingMaterialList = z.output<typeof readingListSchema>;
export type ReadingListFilters = {
  genre?: string;
  levels?: string[];
  limit?: number;
  q?: string;
  sort?: 'newest' | 'oldest';
  reading_status?: 'unread' | 'read';
};
export type ReadingSettingsInput = Pick<
  ReadingSettings,
  'defaultLevel' | 'defaultWordCount' | 'minWordCount' | 'maxWordCount'
> & { defaultQuestionCount?: number };

export const getReadingSettings = (signal?: AbortSignal): Promise<ReadingSettings> =>
  apiRequest('/api/v1/reading/settings', readingSettingsSchema, { signal });

export const updateReadingSettings = (input: ReadingSettingsInput): Promise<ReadingSettings> =>
  apiRequest('/api/v1/reading/settings', readingSettingsSchema, {
    body: {
      default_level: input.defaultLevel,
      default_word_count: input.defaultWordCount,
      min_word_count: input.minWordCount,
      max_word_count: input.maxWordCount,
      default_question_count: input.defaultQuestionCount,
    },
    method: 'PATCH',
  });

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

export const saveReadingAnswers = (
  code: string,
  answers: Array<{ questionNumber: number; userAnswer: string | null }>,
): Promise<ReadingMaterial> =>
  apiRequest(`/api/v1/reading/materials/${encodeURIComponent(code)}/answers`, readingMaterialSchema, {
    body: {
      answers: answers.map(({ questionNumber, userAnswer }) => ({
        question_number: questionNumber,
        user_answer: userAnswer,
      })),
    },
    method: 'PATCH',
  });

export const getReadingExpectedAnswers = (code: string, signal?: AbortSignal): Promise<ReadingExpectedAnswer[]> =>
  apiRequest(`/api/v1/reading/materials/${encodeURIComponent(code)}/expected-answers`, expectedAnswersSchema, {
    signal,
  });

export const markReadingMaterial = (
  code: string,
  readingStatus: ReadingMaterial['readingStatus'],
): Promise<ReadingMaterial> =>
  apiRequest(`/api/v1/reading/materials/${encodeURIComponent(code)}`, readingMaterialSchema, {
    method: 'PATCH',
    body: { reading_status: readingStatus },
  });
