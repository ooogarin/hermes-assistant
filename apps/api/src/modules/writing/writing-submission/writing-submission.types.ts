import type { z } from 'zod';
import type { PaginationMeta } from '../../../shared/response/pagination';
import type {
  analysisSchema,
  createSubmissionSchema,
  listSubmissionsSchema,
  saveAnalysisSchema,
  updateSubmissionSchema,
} from './writing-submission.validator';

// ==========[ Request contracts ]==========================================================================================

export type CreateWritingSubmissionRequest = z.infer<typeof createSubmissionSchema>;

export type UpdateWritingSubmissionRequest = z.infer<typeof updateSubmissionSchema>;

export type SaveWritingAnalysisRequest = z.infer<typeof saveAnalysisSchema>;

export type ListWritingSubmissionsRequest = z.infer<typeof listSubmissionsSchema>;

export type WritingSubmissionReferenceRequest = {
  code: string;
};

export type WritingAnalysis = z.infer<typeof analysisSchema>;

type WritingAnalysisStatus = 'not_analyzed' | 'analyzed';

// ==========[ Service operations ]==========================================================================================

type WritingEstimatedMetadata = {
  estimated_topic: string | null;
  estimated_genre: string | null;
  estimated_tags: string[] | null;
  estimated_level: string | null;
};

export type WritingSubmission = WritingEstimatedMetadata & {
  code: string;
  material_code: string | null;
  original_text: string;
  word_count: number;
  analysis_status: WritingAnalysisStatus;
  analysis: WritingAnalysis | null;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
};

type WritingSubmissionListItem = WritingEstimatedMetadata & {
  code: string;
  material_code: string | null;
  text_excerpt: string;
  word_count: number;
  analysis_status: WritingAnalysisStatus;
  created_at: string;
  updated_at: string;
};

export type WritingSubmissionList = { items: WritingSubmissionListItem[]; meta: PaginationMeta };

export type WritingCorrectedText = { code: string; corrected_text: string };

export type WritingSubmissionService = {
  createSubmission: (input: CreateWritingSubmissionRequest) => Promise<WritingSubmission>;
  listSubmissions: (input: ListWritingSubmissionsRequest) => Promise<WritingSubmissionList>;
  getSubmission: (reference: WritingSubmissionReferenceRequest) => Promise<WritingSubmission>;
  updateSubmission: (
    reference: WritingSubmissionReferenceRequest,
    input: UpdateWritingSubmissionRequest,
  ) => Promise<WritingSubmission>;
  saveAnalysis: (
    reference: WritingSubmissionReferenceRequest,
    input: SaveWritingAnalysisRequest,
  ) => Promise<WritingSubmission>;
  getCorrectedText: (reference: WritingSubmissionReferenceRequest) => Promise<WritingCorrectedText>;
};

// ==========[ Repository payloads ]==========================================================================================

export type InsertWritingSubmissionPayload = {
  code: string;
  material_id: number | string | null;
  original_text: string;
  word_count: number;
};

export type SaveWritingAnalysisPayload = {
  estimated_topic: string;
  estimated_genre: string;
  estimated_tags: string[];
  estimated_level: string;
  analysis: WritingAnalysis;
};

export type UpdateWritingSubmissionPayload = UpdateWritingSubmissionRequest & { word_count?: number };

export type ListWritingSubmissionsQuery = ListWritingSubmissionsRequest;

// ==========[ Repository responses ]==========================================================================================

export type WritingSequenceRow = { sequence: number };

export type WritingSubmissionRow = WritingEstimatedMetadata & {
  code: string;
  material_code: string | null;
  original_text: string;
  word_count: number;
  analysis: WritingAnalysis | null;
  analyzed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type WritingSubmissionWriteRow = Omit<WritingSubmissionRow, 'material_code'>;

export type WritingSubmissionListRow = WritingEstimatedMetadata & {
  code: string;
  material_code: string | null;
  text_excerpt: string;
  word_count: number;
  analysis_status: WritingAnalysisStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

export type WritingCountRow = { total: number | string };
