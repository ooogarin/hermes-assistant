import type { z } from 'zod';
import type {
  createMaterialSchema,
  listMaterialsSchema,
  materialCodeSchema,
  saveAnswersSchema,
  updateMaterialSchema,
} from './reading.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type ReadingStatus = 'unread' | 'read';
export type UpdateReadingMaterialRequest = z.infer<typeof updateMaterialSchema>;

export type ReadingSource = 'cron' | 'request';
export type CreateReadingMaterialRequest = z.infer<typeof createMaterialSchema>;
export type ListReadingMaterialsRequest = z.infer<typeof listMaterialsSchema>;
export type SaveReadingAnswersRequest = z.infer<typeof saveAnswersSchema>;
export type ReadingMaterialParams = z.infer<typeof materialCodeSchema>;

// ====================================================================================================
// Service operations
// ====================================================================================================

export type ReadingQuestion = {
  question_number: number;
  question_text: string;
  user_answer: string | null;
};

export type ReadingMaterial = {
  code: string;
  title: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  target_question_count: number;
  word_count: number;
  content_text: string;
  reading_status: ReadingStatus;
  created_at: string;
  updated_at: string;
  is_override: boolean;
  source: ReadingSource;
  questions: ReadingQuestion[];
};

export type ReadingExpectedAnswer = {
  question_number: number;
  question_text: string;
  expected_answer: string;
};

export type ReadingMaterialListItem = {
  code: string;
  title: string;
  content_excerpt: string;
  genre: string;
  level: string;
  tags: string[];
  reading_status: ReadingStatus;
  created_at: string;
};
export type ReadingMaterialList = { items: ReadingMaterialListItem[] };

export type ReadingService = {
  createMaterial: (input: CreateReadingMaterialRequest) => Promise<ReadingMaterial>;
  listMaterials: (input: ListReadingMaterialsRequest) => Promise<ReadingMaterialList>;
  getMaterial: (code: string) => Promise<ReadingMaterial>;
  saveAnswers: (code: string, input: SaveReadingAnswersRequest) => Promise<ReadingMaterial>;
  updateMaterial: (code: string, input: UpdateReadingMaterialRequest) => Promise<ReadingMaterial>;
  getExpectedAnswers: (code: string) => Promise<ReadingExpectedAnswer[]>;
};

// ====================================================================================================
// Repository payloads
// ====================================================================================================

export type CreateReadingMaterialPayload = {
  title: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  target_question_count: number;
  content_text: string;
  source: ReadingSource;
  questions: Array<{
    question_number: number;
    question_text: string;
    expected_answer: string;
  }>;
};

export type ListReadingMaterialsQuery = ListReadingMaterialsRequest;

export type SaveReadingAnswersPayload = {
  answers: Array<{ question_number: number; user_answer: string }>;
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
export type ReadingMaterialRow = {
  id: number;
  code: string;
  title: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  target_question_count: number;
  word_count: number;
  content_text: string;
  reading_status: ReadingStatus;
  created_at: Date | string;
  updated_at: Date | string;
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
export type ReadingMaterialListRow = Omit<ReadingMaterialListItem, 'created_at'> & { created_at: Date | string };
