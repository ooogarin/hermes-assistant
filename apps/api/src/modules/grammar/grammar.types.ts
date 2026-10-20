import type { z } from 'zod';
import type {
  createSessionSchema,
  evaluateSessionSchema,
  listSessionsSchema,
  saveAnswersSchema,
} from './grammar.validator';
import type { GrammarQuestion } from './grammar-question/grammar-question.types';

// ==========[ Request contracts ]==========================================================================================

type GrammarMode = 'practice' | 'exam';
type GrammarSource = 'cron' | 'request';
type GrammarSessionStatus = 'active' | 'completed' | 'abandoned';
export type GrammarAnswerResult = 'correct' | 'partial' | 'incorrect';

export type CreateGrammarSessionRequest = z.infer<typeof createSessionSchema>;
export type SaveAnswersRequest = z.infer<typeof saveAnswersSchema>;
export type EvaluateGrammarSessionRequest = z.infer<typeof evaluateSessionSchema>;
export type ListGrammarSessionsRequest = z.infer<typeof listSessionsSchema>;

export type GrammarSessionReferenceRequest = {
  code: string;
};

export type GrammarQuestionReferenceRequest = {
  code: string;
  question_number: number;
};

// ==========[ Service operations ]==========================================================================================

export type GrammarSession = {
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  status: GrammarSessionStatus;
  level: string;
  question_count: number;
  score: number | null;
  max_score: number | null;
  started_at: string;
  completed_at: string | null;
  questions: GrammarQuestion[];
};

export type GrammarSessionListItem = {
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  status: GrammarSessionStatus;
  level: string;
  question_count: number;
  score: number | null;
  max_score: number | null;
  started_at: string;
  completed_at: string | null;
};

export type GrammarSessionList = {
  items: GrammarSessionListItem[];
};

export type GrammarExplanation = {
  question_number: number;
  question_text: string;
  grammar_area: string;
  grammar_point: string;
  explanation: string;
};

type GrammarReportBreakdown = {
  grammar_area: string;
  correct: number;
  partial: number;
  incorrect: number;
};

export type GrammarReport = {
  code: string;
  status: GrammarSessionStatus;
  score: number | null;
  max_score: number | null;
  breakdown: GrammarReportBreakdown[];
};

export type GrammarService = {
  createSession: (input: CreateGrammarSessionRequest) => Promise<GrammarSession>;
  listSessions: (input: ListGrammarSessionsRequest) => Promise<GrammarSessionList>;
  getSession: (reference: GrammarSessionReferenceRequest) => Promise<GrammarSession>;
  removeSession: (reference: GrammarSessionReferenceRequest) => Promise<void>;
  saveAnswers: (reference: GrammarSessionReferenceRequest, input: SaveAnswersRequest) => Promise<GrammarSession>;
  getExplanation: (reference: GrammarQuestionReferenceRequest) => Promise<GrammarExplanation>;
  evaluateSession: (
    reference: GrammarSessionReferenceRequest,
    input: EvaluateGrammarSessionRequest,
  ) => Promise<GrammarReport>;
  getReport: (reference: GrammarSessionReferenceRequest) => Promise<GrammarReport>;
};

// ==========[ Repository payloads ]==========================================================================================

export type InsertGrammarSessionPayload = {
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  level: string;
  question_count: number;
};

export type SaveAnswersPayload = {
  answers: Array<{
    question_number: number;
    user_answer: string;
    result: GrammarAnswerResult | null;
    feedback: string | null;
  }>;
};

export type EvaluateGrammarSessionPayload = {
  answers: Array<{
    question_number: number;
    result: GrammarAnswerResult;
    feedback: string | null;
  }>;
};

export type ListGrammarSessionsQuery = {
  q?: string;
  status?: GrammarSessionStatus;
  mode?: GrammarMode;
  level?: string;
  limit: number;
  sort: 'newest' | 'oldest';
};

// ==========[ Repository responses ]==========================================================================================

export type IdRow = {
  id: number;
};

export type SequenceRow = {
  sequence: number;
};

export type GrammarSessionRow = {
  id: number;
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  status: GrammarSessionStatus;
  level: string;
  question_count: number;
  score: number | string | null;
  max_score: number | null;
  started_at: Date | string;
  completed_at: Date | string | null;
};

export type GrammarSessionListRow = {
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  status: GrammarSessionStatus;
  level: string;
  question_count: number | string;
  score: number | string | null;
  max_score: number | string | null;
  started_at: Date | string;
  completed_at: Date | string | null;
};

export type GrammarExplanationRow = {
  question_number: number;
  question_text: string;
  grammar_area: string;
  grammar_point: string;
  explanation: string;
  answer_result: GrammarAnswerResult | null;
};

export type GrammarReportRow = {
  code: string;
  status: GrammarSessionStatus;
  score: number | string | null;
  max_score: number | null;
  grammar_area: string;
  correct: number | string;
  partial: number | string;
  incorrect: number | string;
};
