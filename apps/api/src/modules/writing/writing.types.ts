import type { z } from 'zod';
import type {
  analysisSchema,
  createMaterialSchema,
  createSubmissionSchema,
  listMaterialsSchema,
  materialCodeSchema,
  submissionParamsSchema,
} from './writing.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type CreateWritingMaterialRequest = z.infer<typeof createMaterialSchema>;
export type CreateWritingSubmissionRequest = z.infer<typeof createSubmissionSchema>;
export type ListWritingMaterialsRequest = z.infer<typeof listMaterialsSchema>;
export type WritingMaterialParams = z.infer<typeof materialCodeSchema>;
export type WritingSubmissionParams = z.infer<typeof submissionParamsSchema>;
export type WritingSource = 'cron' | 'request';
export type WritingAnalysis = z.infer<typeof analysisSchema>;

// ====================================================================================================
// Service operations
// ====================================================================================================

export type WritingMaterial = {
  code: string;
  topic: string;
  prompt_text: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  is_override: boolean;
  source: WritingSource;
};

export type WritingSubmission = {
  submission_number: number;
  original_text: string;
  word_count: number;
  estimated_level: string;
  analysis: WritingAnalysis;
  submitted_at: string;
};
export type WritingMaterialListItem = {
  code: string;
  topic: string;
  prompt_excerpt: string;
  genre: string;
  level: string;
  target_word_count: number;
  tags: string[];
  source: WritingSource;
  status: 'unsubmitted' | 'reviewed';
  submission_count: number;
  latest_submission_number: number | null;
  created_at: string;
};
export type WritingMaterialList = {
  items: WritingMaterialListItem[];
  meta: WritingPaginationMeta;
};
export type WritingPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};
export type WritingService = {
  createMaterial: (input: CreateWritingMaterialRequest) => Promise<WritingMaterial>;
  listMaterials: (input: ListWritingMaterialsRequest) => Promise<WritingMaterialList>;
  getMaterial: (code: string) => Promise<WritingMaterial>;
  createSubmission: (code: string, input: CreateWritingSubmissionRequest) => Promise<WritingSubmission>;
  getSubmission: (code: string, submission_number: number) => Promise<WritingSubmission>;
  getCorrectedText: (code: string, submission_number: number) => Promise<WritingCorrectedText>;
};

export type WritingCorrectedText = {
  submission_number: number;
  corrected_text: string;
};

// ====================================================================================================
// Repository payloads
// ====================================================================================================

export type CreateWritingMaterialPayload = {
  topic: string;
  prompt_text: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  source: WritingSource;
};

export type CreateWritingSubmissionPayload = {
  original_text: string;
  estimated_level: string;
  analysis: WritingAnalysis;
};

export type ListWritingMaterialsQuery = {
  q?: string;
  status?: 'unsubmitted' | 'reviewed';
  levels?: string[];
  genre?: string;
  page: number;
  limit: number;
  sort: 'newest' | 'oldest';
};

// ====================================================================================================
// Repository responses
// ====================================================================================================

export type WritingSequenceRow = {
  sequence: number;
};

export type WritingMaterialRow = {
  code: string;
  topic: string;
  prompt_text: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  is_override: boolean;
  source: WritingSource;
};

export type WritingSubmissionRow = {
  submission_number: number;
  original_text: string;
  word_count: number;
  estimated_level: string;
  analysis: WritingAnalysis;
  submitted_at: Date | string;
};
export type WritingMaterialListRow = {
  code: string;
  topic: string;
  prompt_text: string;
  genre: string;
  level: string;
  target_word_count: number;
  tags: string[];
  source: WritingSource;
  submission_count: number | string;
  latest_submission_number: number | string | null;
  created_at: Date | string;
};
export type WritingCountRow = {
  total: number | string;
};
