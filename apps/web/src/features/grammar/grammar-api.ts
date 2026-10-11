import { z } from 'zod';
import { apiRequest } from '../../lib/api/api-client';
import { buildQueryString } from '../../lib/api/query-string';

const grammarSettingsSchema = z
  .object({
    default_level: z.string(),
    daily_question_count: z.number().int().min(1).max(100),
    updated_at: z.string(),
  })
  .transform(({ daily_question_count, default_level, updated_at }) => ({
    dailyQuestionCount: daily_question_count,
    defaultLevel: default_level,
    updatedAt: updated_at,
  }));

const answerResultSchema = z.enum(['correct', 'partial', 'incorrect']);

const grammarQuestionSchema = z
  .object({
    question_number: z.number().int().positive(),
    question_type: z.string(),
    grammar_area: z.string(),
    grammar_point: z.string(),
    level: z.string(),
    question_text: z.string(),
    answer: z
      .object({
        user_answer: z.string(),
        result: answerResultSchema.nullable(),
        feedback: z.string().nullable(),
        answered_at: z.string().nullable(),
        evaluated_at: z.string().nullable(),
      })
      .nullable(),
  })
  .transform(({ grammar_area, grammar_point, question_number, question_text, question_type, ...question }) => ({
    ...question,
    grammarArea: grammar_area,
    grammarPoint: grammar_point,
    questionNumber: question_number,
    questionText: question_text,
    questionType: question_type,
    answer:
      question.answer === null
        ? null
        : {
            answeredAt: question.answer.answered_at,
            evaluatedAt: question.answer.evaluated_at,
            feedback: question.answer.feedback,
            result: question.answer.result,
            userAnswer: question.answer.user_answer,
          },
  }));

const grammarSessionSchema = z
  .object({
    code: z.string(),
    mode: z.enum(['practice', 'exam']),
    source: z.enum(['cron', 'request']),
    status: z.enum(['active', 'completed', 'abandoned']),
    level: z.string(),
    question_count: z.number().int().positive(),
    score: z.number().nullable(),
    max_score: z.number().nullable(),
    started_at: z.string(),
    completed_at: z.string().nullable(),
    questions: z.array(grammarQuestionSchema),
  })
  .transform(({ completed_at, question_count, started_at, ...session }) => ({
    ...session,
    completedAt: completed_at,
    questionCount: question_count,
    startedAt: started_at,
  }));

const grammarExplanationSchema = z
  .object({
    question_number: z.number().int().positive(),
    question_text: z.string(),
    grammar_area: z.string(),
    grammar_point: z.string(),
    explanation: z.string(),
  })
  .transform(({ grammar_area, grammar_point, question_number, question_text, ...explanation }) => ({
    ...explanation,
    grammarArea: grammar_area,
    grammarPoint: grammar_point,
    questionNumber: question_number,
    questionText: question_text,
  }));

const grammarBreakdownSchema = z
  .object({
    grammar_area: z.string(),
    correct: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    incorrect: z.number().int().nonnegative(),
  })
  .transform(({ grammar_area, ...breakdown }) => ({ ...breakdown, grammarArea: grammar_area }));

const grammarReportSchema = z
  .object({
    code: z.string(),
    status: z.enum(['active', 'completed', 'abandoned']),
    score: z.number().nullable(),
    max_score: z.number().nullable(),
    breakdown: z.array(grammarBreakdownSchema),
  })
  .transform(({ max_score, ...report }) => ({ ...report, maxScore: max_score }));

const grammarPaginationMetaSchema = z
  .object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    total_pages: z.number().int(),
  })
  .transform(({ total_pages, ...meta }) => ({ ...meta, totalPages: total_pages }));

const grammarSessionListItemSchema = z
  .object({
    code: z.string(),
    mode: z.enum(['practice', 'exam']),
    source: z.enum(['cron', 'request']),
    status: z.enum(['active', 'completed', 'abandoned']),
    level: z.string(),
    grammar_area: z.string().nullable(),
    grammar_point: z.string().nullable(),
    question_count: z.number().int().positive(),
    answered_question_count: z.number().int().nonnegative(),
    score: z.number().nullable(),
    max_score: z.number().nullable(),
    started_at: z.string(),
    completed_at: z.string().nullable(),
  })
  .transform(({ completed_at, grammar_area, grammar_point, max_score, question_count, started_at, ...session }) => ({
    ...session,
    completedAt: completed_at,
    grammarArea: grammar_area,
    grammarPoint: grammar_point,
    maxScore: max_score,
    questionCount: question_count,
    startedAt: started_at,
  }));

const grammarSessionListSchema = z.object({
  items: z.array(grammarSessionListItemSchema),
  meta: grammarPaginationMetaSchema,
});

export type GrammarSessionListItem = z.output<typeof grammarSessionListItemSchema>;
export type GrammarSessionList = z.output<typeof grammarSessionListSchema>;
export type GrammarSessionListFilters = {
  level?: string;
  limit?: number;
  mode?: 'practice' | 'exam';
  page?: number;
  q?: string;
  sort?: 'newest' | 'oldest';
  status?: 'active' | 'completed' | 'abandoned';
};
export type GrammarSettings = z.output<typeof grammarSettingsSchema>;
export type GrammarSettingsInput = Partial<Pick<GrammarSettings, 'dailyQuestionCount' | 'defaultLevel'>>;
export type GrammarSession = z.output<typeof grammarSessionSchema>;
export type GrammarQuestion = GrammarSession['questions'][number];
export type GrammarExplanation = z.output<typeof grammarExplanationSchema>;
export type GrammarReport = z.output<typeof grammarReportSchema>;

export const getGrammarSettings = (signal?: AbortSignal): Promise<GrammarSettings> =>
  apiRequest('/api/v1/grammar/settings', grammarSettingsSchema, { signal });

export const updateGrammarSettings = (input: GrammarSettingsInput): Promise<GrammarSettings> =>
  apiRequest('/api/v1/grammar/settings', grammarSettingsSchema, {
    body: {
      daily_question_count: input.dailyQuestionCount,
      default_level: input.defaultLevel,
    },
    method: 'PATCH',
  });

export const getGrammarSession = (code: string, signal?: AbortSignal): Promise<GrammarSession> =>
  apiRequest(`/api/v1/grammar/sessions/${encodeURIComponent(code)}`, grammarSessionSchema, { signal });

export const getGrammarSessions = (
  filters: GrammarSessionListFilters,
  signal?: AbortSignal,
): Promise<GrammarSessionList> =>
  apiRequest(`/api/v1/grammar/sessions${buildQueryString(filters)}`, grammarSessionListSchema, { signal });

export type GrammarAnswerInput = { questionNumber: number; userAnswer: string };

export const saveGrammarAnswers = (code: string, answers: GrammarAnswerInput[]): Promise<GrammarSession> =>
  apiRequest(`/api/v1/grammar/sessions/${encodeURIComponent(code)}/answers`, grammarSessionSchema, {
    body: {
      answers: answers.map(({ questionNumber, userAnswer }) => ({
        question_number: questionNumber,
        user_answer: userAnswer,
      })),
    },
    method: 'PUT',
  });

export const getGrammarExplanation = (
  code: string,
  questionNumber: number,
  signal?: AbortSignal,
): Promise<GrammarExplanation> =>
  apiRequest(
    `/api/v1/grammar/sessions/${encodeURIComponent(code)}/questions/${questionNumber}/explanation`,
    grammarExplanationSchema,
    { signal },
  );

export const getGrammarReport = (code: string, signal?: AbortSignal): Promise<GrammarReport> =>
  apiRequest(`/api/v1/grammar/sessions/${encodeURIComponent(code)}/report`, grammarReportSchema, { signal });
