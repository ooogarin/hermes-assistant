import type { z } from 'zod';
import type { DatabaseReservedConnection } from '../../../core/database/database.types';
import type { PaginationMeta } from '../../../shared/response/pagination';
import type { createMaterialSchema, listMaterialsSchema } from './writing-material.validator';

// ==========[ Request contracts ]==========================================================================================

export type CreateWritingMaterialRequest = z.infer<typeof createMaterialSchema>;

export type ListWritingMaterialsRequest = z.infer<typeof listMaterialsSchema>;

export type WritingMaterialReferenceRequest = {
  code: string;
};

type WritingSource = 'cron' | 'request';

export type WritingMaterialStatus = 'unsubmitted' | 'submitted' | 'reviewed';

// ==========[ Service operations ]==========================================================================================

export type WritingMaterial = {
  code: string;
  topic: string;
  prompt_text: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  source: WritingSource;
};

export type WritingMaterialListItem = Omit<WritingMaterial, 'prompt_text'> & {
  prompt_excerpt: string;
  status: WritingMaterialStatus;
  submission_count: number;
  analyzed_submission_count: number;
  unanalyzed_submission_count: number;
  latest_submission_code: string | null;
  created_at: string;
};

export type WritingMaterialList = { items: WritingMaterialListItem[]; meta: PaginationMeta };

export type WritingMaterialReference = { id: number | string; code: string };

export type WritingMaterialService = {
  createMaterial: (input: CreateWritingMaterialRequest) => Promise<WritingMaterial>;
  listMaterials: (input: ListWritingMaterialsRequest) => Promise<WritingMaterialList>;
  getMaterial: (reference: WritingMaterialReferenceRequest) => Promise<WritingMaterial>;
  getMaterialReference: (code: string, trx: DatabaseReservedConnection) => Promise<WritingMaterialReference>;
};

// ==========[ Repository payloads ]==========================================================================================

export type InsertWritingMaterialPayload = {
  code: string;
  topic: string;
  prompt_text: string;
  level: string;
  genre: string;
  tags: string[];
  target_word_count: number;
  source: WritingSource;
};

export type ListWritingMaterialsQuery = {
  q?: string;
  status?: WritingMaterialStatus;
  levels?: string[];
  genre?: string;
  page: number;
  limit: number;
  sort: 'newest' | 'oldest';
};

// ==========[ Repository responses ]==========================================================================================

export type WritingSequenceRow = { sequence: number };

export type WritingMaterialRow = WritingMaterial & { id: number | string };

export type WritingMaterialListRow = WritingMaterial & {
  submission_count: number | string;
  analyzed_submission_count: number | string;
  latest_submission_code: string | null;
  created_at: Date | string;
};

export type WritingCountRow = { total: number | string };
