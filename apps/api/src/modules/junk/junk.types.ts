import type { z } from 'zod';
import type { createJunkSchema, searchJunkSchema, updateJunkSchema } from './junk.validator';

// ==========[ Request contracts ]==========================================================================================

export type CreateJunkRequest = z.infer<typeof createJunkSchema>;
export type UpdateJunkRequest = z.infer<typeof updateJunkSchema>;
export type ListJunkRequest = z.infer<typeof searchJunkSchema>;

export type JunkReferenceRequest = {
  code: string;
};

// ==========[ Service operations ]==========================================================================================

export type JunkItem = {
  code: string;
  title: string | null;
  category: string;
  raw_text: string | null;
  content_text: string | null;
  source_url: string | null;
  source_name: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type JunkService = {
  create: (input: CreateJunkRequest) => Promise<JunkItem>;
  getDetail: (input: JunkReferenceRequest) => Promise<JunkItem>;
  list: (input: ListJunkRequest) => Promise<JunkItem[]>;
  update: (reference: JunkReferenceRequest, input: UpdateJunkRequest) => Promise<JunkItem>;
  remove: (input: JunkReferenceRequest) => Promise<void>;
};

// ==========[ Repository payloads ]==========================================================================================

export type InsertJunkPayload = {
  code: string;
  title: string | null;
  category: string;
  raw_text: string | null;
  content_text: string | null;
  source_url: string | null;
  source_name: string | null;
  tags: string[];
};

export type ListJunkRepositoryQuery = {
  q?: string;
  tag?: string;
  category?: string;
  source_url?: string;
  source?: string;
  from?: string;
  to?: string;
  sort: 'newest' | 'oldest';
  limit: number;
};

export type UpdateJunkPayload = {
  title?: string | null;
  category?: string;
  content_text?: string | null;
  source_url?: string | null;
  source_name?: string | null;
  tags?: string[];
};

// ==========[ Repository responses ]==========================================================================================

export type JunkItemRow = {
  code: string;
  title: string | null;
  category: string;
  raw_text: string | null;
  content_text: string | null;
  source_url: string | null;
  source_name: string | null;
  tags: string[];
  created_at: Date | string;
  updated_at: Date | string;
};

export type JunkSequenceRow = {
  sequence: number;
};
