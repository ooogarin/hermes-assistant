import type { z } from 'zod';
import type {
  analysisSchema,
  createMaterialSchema,
  createSubmissionSchema,
  listMaterialsSchema,
  materialCodeSchema,
  submissionParamsSchema,
  updateSettingsSchema,
} from './writing.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type CreateWritingMaterialRequest = z.infer<typeof createMaterialSchema>;
export type CreateWritingSubmissionRequest = z.infer<typeof createSubmissionSchema>;
export type ListWritingMaterialsRequest = z.infer<typeof listMaterialsSchema>;
export type UpdateWritingSettingsRequest = z.infer<typeof updateSettingsSchema>;
export type WritingMaterialParams = z.infer<typeof materialCodeSchema>;
export type WritingSubmissionParams = z.infer<typeof submissionParamsSchema>;
export type WritingSource = 'cron' | 'request';
export type WritingAnalysis = z.infer<typeof analysisSchema>;

// ====================================================================================================
// Service operations
// ====================================================================================================

export type WritingSettings = {
  defaultLevel: string;
  defaultWordCount: number;
  minWordCount: number;
  maxWordCount: number;
  updatedAt: string;
};

export type WritingMaterial = {
  code: string;
  topic: string;
  promptText: string;
  level: string;
  genre: string;
  tags: string[];
  targetWordCount: number;
  isOverride: boolean;
  source: WritingSource;
};

export type WritingSubmission = {
  submissionNumber: number;
  originalText: string;
  wordCount: number;
  estimatedLevel: string;
  analysis: WritingAnalysis;
  submittedAt: string;
};
export type WritingMaterialListItem = {
  code: string;
  topic: string;
  promptExcerpt: string;
  genre: string;
  level: string;
  targetWordCount: number;
  tags: string[];
  source: WritingSource;
  status: 'unsubmitted' | 'reviewed';
  submissionCount: number;
  latestSubmissionNumber: number | null;
  createdAt: string;
};
export type WritingMaterialList = {
  items: WritingMaterialListItem[];
  meta: WritingPaginationMeta;
};
export type WritingPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type WritingService = {
  getSettings: () => Promise<WritingSettings>;
  updateSettings: (input: UpdateWritingSettingsRequest) => Promise<WritingSettings>;
  createMaterial: (input: CreateWritingMaterialRequest) => Promise<WritingMaterial>;
  listMaterials: (input: ListWritingMaterialsRequest) => Promise<WritingMaterialList>;
  getMaterial: (code: string) => Promise<WritingMaterial>;
  createSubmission: (code: string, input: CreateWritingSubmissionRequest) => Promise<WritingSubmission>;
  getSubmission: (code: string, submissionNumber: number) => Promise<WritingSubmission>;
  getCorrectedText: (code: string, submissionNumber: number) => Promise<WritingCorrectedText>;
};

export type WritingCorrectedText = {
  submissionNumber: number;
  correctedText: string;
};

// ====================================================================================================
// Repository responses
// ====================================================================================================

export type WritingSettingsRow = {
  default_level: string;
  default_word_count: number;
  min_word_count: number;
  max_word_count: number;
  updated_at: Date | string;
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
  prompt_excerpt: string;
  genre: string;
  level: string;
  target_word_count: number;
  tags: string[];
  source: WritingSource;
  status: 'unsubmitted' | 'reviewed';
  submission_count: number | string;
  latest_submission_number: number | string | null;
  created_at: Date | string;
};
export type WritingCountRow = {
  total: number | string;
};
