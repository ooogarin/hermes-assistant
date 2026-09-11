import type { z } from 'zod';
import type { createJunkSchema, junkCodeSchema, searchJunkSchema, updateJunkSchema } from './junk.validator';

// ====================================================================================================
// Request contracts
// ====================================================================================================

export type JunkCodeParams = z.infer<typeof junkCodeSchema>;
export type CreateJunkRequest = z.infer<typeof createJunkSchema>;
export type UpdateJunkRequest = z.infer<typeof updateJunkSchema>;
export type ListJunkRequest = z.infer<typeof searchJunkSchema>;

export type JunkReferenceRequest = {
  code: string;
};

// ====================================================================================================
// Service operations
// ====================================================================================================

export type JunkItem = {
  code: string;
  title: string | null;
  category: string;
  raw_text: string | null;
  content_text: string | null;
  source_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type JunkService = {
  create: (input: CreateJunkRequest) => Promise<JunkItem>;
  getDetail: (input: JunkReferenceRequest) => Promise<JunkItem>;
  list: (input: ListJunkRequest) => Promise<JunkItem[]>;
  update: (reference: JunkReferenceRequest, input: UpdateJunkRequest) => Promise<JunkItem>;
  remove: (input: JunkReferenceRequest) => Promise<void>;
};

// ====================================================================================================
// Repository payloads
// ====================================================================================================

export type CreateJunkPayload = {
  title: string | null;
  category: string;
  raw_text: string | null;
  content_text: string | null;
  source_url: string | null;
  tags: string[];
};

export type ListJunkRepositoryQuery = {
  q?: string;
  tag?: string;
  category?: string;
  source_url?: string;
  limit: number;
};

export type UpdateJunkPayload = {
  title?: string | null;
  category?: string;
  content_text?: string | null;
  source_url?: string | null;
  tags?: string[];
};

// ====================================================================================================
// Repository responses
// ====================================================================================================

export type JunkItemRow = {
  code: string;
  title: string | null;
  category: string;
  raw_text: string | null;
  content_text: string | null;
  source_url: string | null;
  tags: string[];
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

export type JunkSequenceRow = {
  sequence: number;
};
