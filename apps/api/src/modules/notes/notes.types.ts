import type { z } from 'zod';
import type { createNoteSchema, searchNotesSchema, updateNoteSchema } from './notes.validator';

export const noteTypes = ['fact', 'personal', 'news', 'quote', 'idea', 'reminder'] as const;

// ==========[ Request contracts ]==========================================================================================

type NoteType = (typeof noteTypes)[number];

export type CreateNoteRequest = z.infer<typeof createNoteSchema>;
export type UpdateNoteRequest = z.infer<typeof updateNoteSchema>;
export type ListNotesRequest = z.infer<typeof searchNotesSchema>;

export type NoteReferenceRequest = {
  code: string;
};

// ==========[ Service operations ]==========================================================================================

export type Note = {
  code: string;
  title: string;
  content_text: string;
  raw_text: string | null;
  type: NoteType;
  category: string;
  source_name: string | null;
  source_url: string | null;
  source_context: string | null;
  source_reference: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type NotesService = {
  create: (input: CreateNoteRequest) => Promise<Note>;
  getDetail: (input: NoteReferenceRequest) => Promise<Note>;
  list: (input: ListNotesRequest) => Promise<Note[]>;
  update: (reference: NoteReferenceRequest, input: UpdateNoteRequest) => Promise<Note>;
  remove: (input: NoteReferenceRequest) => Promise<void>;
};

// ==========[ Repository payloads ]==========================================================================================

export type InsertNotePayload = {
  code: string;
  title: string;
  content_text: string;
  raw_text: string | null;
  type: NoteType;
  category: string;
  source_name: string | null;
  source_url: string | null;
  source_context: string | null;
  source_reference: string | null;
  tags: string[];
};

export type ListNotesRepositoryQuery = {
  q?: string;
  type?: NoteType;
  tag?: string;
  category?: string;
  source?: string;
  from?: string;
  to?: string;
  sort: 'newest' | 'oldest';
  limit: number;
};

export type UpdateNotePayload = {
  title?: string;
  content_text?: string;
  type?: NoteType;
  category?: string;
  source_name?: string | null;
  source_url?: string | null;
  source_context?: string | null;
  source_reference?: string | null;
  tags?: string[];
};

// ==========[ Repository responses ]==========================================================================================

export type NoteRow = {
  code: string;
  title: string;
  content_text: string;
  raw_text: string | null;
  type: NoteType;
  category: string;
  source_name: string | null;
  source_url: string | null;
  source_context: string | null;
  source_reference: string | null;
  tags: string[];
  created_at: Date | string;
  updated_at: Date | string;
};

export type NoteSequenceRow = {
  sequence: number;
};
