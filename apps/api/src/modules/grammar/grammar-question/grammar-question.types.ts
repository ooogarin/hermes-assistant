import type { GrammarAnswerResult } from '../grammar.types';

// ==========[ Service operations ]==========================================================================================

export type GrammarQuestion = {
  question_number: number;
  question_type: string;
  grammar_area: string;
  grammar_point: string;
  level: string;
  question_text: string;
  answer: {
    user_answer: string;
    result: GrammarAnswerResult | null;
    feedback: string | null;
    answered_at: string | null;
    evaluated_at: string | null;
  } | null;
};

// ==========[ Repository payloads ]==========================================================================================

export type InsertGrammarQuestionPayload = {
  question_number: number;
  question_type: string;
  grammar_area: string;
  grammar_point: string;
  level: string;
  question_text: string;
  correct_answer: string;
  explanation: string;
};

// ==========[ Repository responses ]==========================================================================================

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
