import type { z } from 'zod';
import type {
  createMaterialSchema,
  listMaterialsSchema,
  materialCodeSchema,
  saveSubmissionSchema,
  updateSettingsSchema,
} from './reading.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type ReadingSource = 'cron' | 'request';
export type CreateReadingMaterialRequest = z.infer<typeof createMaterialSchema>;
export type ListReadingMaterialsRequest = z.infer<typeof listMaterialsSchema>;
export type SaveReadingSubmissionRequest = z.infer<typeof saveSubmissionSchema>;
export type UpdateReadingSettingsRequest = z.infer<typeof updateSettingsSchema>;
export type ReadingMaterialParams = z.infer<typeof materialCodeSchema>;

// ====================================================================================================
// Service operations
// ====================================================================================================

export type ReadingSettings = {
  default_level: string;
  default_word_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: string;
};

export type ReadingQuestion = {
  question_number: number;
  question_text: string;
  user_answer: string | null;
};

export type ReadingMaterial = {
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
  questions: ReadingQuestion[];
};

export type ReadingExpectedAnswer = {
  question_number: number;
  question_text: string;
  expected_answer: string;
};

export type ReadingMaterialListItem = {
  code: string;
  topic: string;
  genre: string;
  level: string;
  target_word_count: number;
  word_count: number;
  tags: string[];
  source: ReadingSource;
  status: 'unanswered' | 'completed';
  question_count: number;
  answered_question_count: number;
  created_at: string;
};

export type ReadingMaterialList = {
  items: ReadingMaterialListItem[];
  meta: PaginationMeta;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ReadingService = {
  getSettings: () => Promise<ReadingSettings>;
  updateSettings: (input: UpdateReadingSettingsRequest) => Promise<ReadingSettings>;
  createMaterial: (input: CreateReadingMaterialRequest) => Promise<ReadingMaterial>;
  listMaterials: (input: ListReadingMaterialsRequest) => Promise<ReadingMaterialList>;
  getMaterial: (code: string) => Promise<ReadingMaterial>;
  saveSubmission: (code: string, input: SaveReadingSubmissionRequest) => Promise<ReadingMaterial>;
  getExpectedAnswers: (code: string) => Promise<ReadingExpectedAnswer[]>;
};

// ====================================================================================================
// Repository payloads
// ====================================================================================================

export type CreateReadingMaterialPayload = {
  topic: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  passage_text: string;
  source: ReadingSource;
  questions: Array<{
    question_number: number;
    question_text: string;
    expected_answer: string;
  }>;
};

export type ListReadingMaterialsQuery = {
  q?: string;
  status?: 'unanswered' | 'completed';
  levels?: string[];
  genre?: string;
  page: number;
  limit: number;
  sort: 'newest' | 'oldest';
};

export type SaveReadingSubmissionPayload = {
  answers: Array<{
    question_number: number;
    user_answer: string;
  }>;
};

export type UpdateReadingSettingsPayload = {
  default_level?: string;
  default_word_count?: number;
  min_word_count?: number;
  max_word_count?: number;
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
export type ReadingMaterialListRow = {
  code: string;
  topic: string;
  genre: string;
  level: string;
  target_word_count: number;
  word_count: number;
  tags: string[];
  source: ReadingSource;
  is_completed: boolean;
  question_count: number | string;
  answered_question_count: number | string;
  created_at: Date | string;
};
export type CountRow = {
  total: number | string;
};
