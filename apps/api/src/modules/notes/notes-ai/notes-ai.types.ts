import type { z } from 'zod';
import type { AiClient } from '../../../core/ai/ai.types';
import type { Note } from '../notes.types';
import type { aiNoteMetadataSchema, createNotesWithAiSchema } from './notes-ai.validator';

// ==========[ Request contracts ]==========================================================================================

export type NotesAiCreateRequest = z.infer<typeof createNotesWithAiSchema>;

// ==========[ Service operations ]==========================================================================================

export type AiNoteMetadata = z.infer<typeof aiNoteMetadataSchema>;

export type NotesAiService = {
  createWithAi: (input: NotesAiCreateRequest, client: AiClient | null) => Promise<Note>;
};
