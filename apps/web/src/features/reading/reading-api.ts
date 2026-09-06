import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';

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
    topic: z.string(),
    level: z.string(),
    genre: z.string(),
    tags: z.array(z.string()),
    target_word_count: z.number().int().positive(),
    word_count: z.number().int().nonnegative(),
    passage_text: z.string(),
    is_override: z.boolean(),
    source: z.enum(['cron', 'request']),
    questions: z.array(readingQuestionSchema),
  })
  .transform(({ is_override, passage_text, target_word_count, word_count, ...material }) => ({
    ...material,
    isOverride: is_override,
    passageText: passage_text,
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

export type ReadingSettings = z.output<typeof readingSettingsSchema>;
export type ReadingMaterial = z.output<typeof readingMaterialSchema>;
export type ReadingExpectedAnswer = z.output<typeof expectedAnswerSchema>;
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
