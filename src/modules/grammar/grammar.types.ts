import type { z } from 'zod';
import type {
  createSessionSchema,
  evaluateSessionSchema,
  questionReferenceSchema,
  saveAnswerSchema,
  sessionCodeSchema,
  updateSettingsSchema,
} from './grammar.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type GrammarMode = 'practice' | 'exam';
export type GrammarSource = 'cron' | 'request';
export type GrammarSessionStatus = 'active' | 'completed' | 'abandoned';
export type GrammarAnswerResult = 'correct' | 'partial' | 'incorrect';

export type CreateGrammarSessionRequest = z.infer<typeof createSessionSchema>;
export type SaveGrammarAnswerRequest = z.infer<typeof saveAnswerSchema>;
export type EvaluateGrammarSessionRequest = z.infer<typeof evaluateSessionSchema>;
export type UpdateGrammarSettingsRequest = z.infer<typeof updateSettingsSchema>;
export type GrammarSessionParams = z.infer<typeof sessionCodeSchema>;
export type GrammarQuestionParams = z.infer<typeof questionReferenceSchema>;

// ====================================================================================================
// Service operations
// ====================================================================================================

export type GrammarSettings = {
  defaultLevel: string;
  dailyQuestionCount: number;
  updatedAt: string;
};

export type GrammarQuestion = {
  questionNumber: number;
  questionType: string;
  grammarArea: string;
  grammarPoint: string;
  level: string;
  questionText: string;
  answer: {
    userAnswer: string;
    result: GrammarAnswerResult | null;
    feedback: string | null;
    answeredAt: string | null;
    evaluatedAt: string | null;
  } | null;
};

export type GrammarSession = {
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  status: GrammarSessionStatus;
  level: string;
  questionCount: number;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  completedAt: string | null;
  questions: GrammarQuestion[];
};

export type GrammarExplanation = {
  questionNumber: number;
  questionText: string;
  grammarArea: string;
  grammarPoint: string;
  explanation: string;
};

export type GrammarReportBreakdown = {
  grammarArea: string;
  correct: number;
  partial: number;
  incorrect: number;
};

export type GrammarReport = {
  code: string;
  status: GrammarSessionStatus;
  score: number | null;
  maxScore: number | null;
  breakdown: GrammarReportBreakdown[];
};

export type GrammarService = {
  getSettings: () => Promise<GrammarSettings>;
  updateSettings: (input: UpdateGrammarSettingsRequest) => Promise<GrammarSettings>;
  createSession: (input: CreateGrammarSessionRequest) => Promise<GrammarSession>;
  getSession: (code: string) => Promise<GrammarSession>;
  removeSession: (code: string) => Promise<void>;
  saveAnswer: (code: string, questionNumber: number, input: SaveGrammarAnswerRequest) => Promise<GrammarSession>;
  getExplanation: (code: string, questionNumber: number) => Promise<GrammarExplanation>;
  evaluateSession: (code: string, input: EvaluateGrammarSessionRequest) => Promise<GrammarReport>;
  getReport: (code: string) => Promise<GrammarReport>;
};

// ====================================================================================================
// Repository payloads and responses
// ====================================================================================================

export type GrammarSessionRow = {
  id: number;
  code: string;
  mode: GrammarMode;
  source: GrammarSource;
  status: GrammarSessionStatus;
  level: string;
  question_count: number;
  score: number | null;
  max_score: number | null;
  started_at: Date | string;
  completed_at: Date | string | null;
};

export type GrammarQuestionRow = {
  id: number;
  question_number: number;
  question_type: string;
  grammar_area: string;
  grammar_point: string;
  level: string;
  question_text: string;
  user_answer: string | null;
  answer_result: GrammarAnswerResult | null;
  feedback: string | null;
  answered_at: Date | string | null;
  evaluated_at: Date | string | null;
};

export type GrammarExplanationRow = {
  question_number: number;
  question_text: string;
  grammar_area: string;
  grammar_point: string;
  explanation: string;
};

export type GrammarReportRow = {
  code: string;
  status: GrammarSessionStatus;
  score: number | null;
  max_score: number | null;
  grammar_area: string;
  correct: number | string;
  partial: number | string;
  incorrect: number | string;
};
