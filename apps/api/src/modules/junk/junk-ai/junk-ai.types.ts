import type { z } from 'zod';
import type { AiClient } from '../../../core/ai/ai.types';
import type { JunkItem } from '../junk.types';
import type { aiJunkMetadataSchema, createJunkWithAiSchema } from './junk-ai.validator';

// ==========[ Request contracts ]==========================================================================================

export type JunkAiCreateRequest = z.infer<typeof createJunkWithAiSchema>;

// ==========[ Service operations ]==========================================================================================

export type AiJunkMetadata = z.infer<typeof aiJunkMetadataSchema>;

export type JunkAiService = {
  createWithAi: (input: JunkAiCreateRequest, client: AiClient | null) => Promise<JunkItem>;
};
