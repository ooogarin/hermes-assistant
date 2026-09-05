import type { z } from 'zod';
import type {
  createMaterialSchema,
  materialCodeSchema,
  saveSubmissionSchema,
  updateSettingsSchema,
} from './reading.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type ReadingSource = 'cron' | 'request';
export type CreateReadingMaterialRequest = z.infer<typeof createMaterialSchema>;
export type SaveReadingSubmissionRequest = z.infer<typeof saveSubmissionSchema>;
export type UpdateReadingSettingsRequest = z.infer<typeof updateSettingsSchema>;
export type ReadingMaterialParams = z.infer<typeof materialCodeSchema>;

// ====================================================================================================
// Service operations
// ====================================================================================================

export type ReadingSettings = {
  defaultLevel: string;
  defaultWordCount: number;
  minWordCount: number;
  maxWordCount: number;
  updatedAt: string;
};

export type ReadingQuestion = {
  questionNumber: number;
  questionText: string;
  userAnswer: string | null;
};

export type ReadingMaterial = {
  code: string;
  topic: string;
  level: string;
  genre: string;
  tags: string[];
  targetWordCount: number;
  wordCount: number;
  passageText: string;
  isOverride: boolean;
  source: ReadingSource;
  questions: ReadingQuestion[];
};

export type ReadingExpectedAnswer = {
  questionNumber: number;
  questionText: string;
  expectedAnswer: string;
};

export type ReadingService = {
  getSettings: () => Promise<ReadingSettings>;
  updateSettings: (input: UpdateReadingSettingsRequest) => Promise<ReadingSettings>;
  createMaterial: (input: CreateReadingMaterialRequest) => Promise<ReadingMaterial>;
  getMaterial: (code: string) => Promise<ReadingMaterial>;
  saveSubmission: (code: string, input: SaveReadingSubmissionRequest) => Promise<ReadingMaterial>;
  getExpectedAnswers: (code: string) => Promise<ReadingExpectedAnswer[]>;
};

// ====================================================================================================
// Repository responses
// ====================================================================================================

export type IdRow = {
  id: number;
};

export type SequenceRow = {
  sequence: number;
};
export type InsertReadingSubmissionResult = 'created' | 'material_not_found' | 'already_submitted';
export type ReadingSettingsRow = {
  default_level: string;
  default_word_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: Date | string;
};
export type ReadingMaterialRow = {
  id: number;
  code: string;
  topic: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  word_count: number;
  passage_text: string;
  is_override: boolean;
  source: ReadingSource;
};
export type ReadingQuestionWithAnswerRow = {
  question_number: number;
  question_text: string;
  user_answer: string | null;
};
export type ReadingExpectedAnswerRow = {
  question_number: number;
  question_text: string;
  expected_answer: string;
};
