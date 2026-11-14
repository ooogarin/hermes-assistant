import { getBody } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as notesAiService from './notes-ai.service';
import { createNotesWithAiSchema } from './notes-ai.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';

export const createWithAi = async (context: Context<AppEnv>) => {
  const input = getBody(context, createNotesWithAiSchema);

  const note = await notesAiService.createWithAi(input, context.get('ai_client'));

  return successResponse({ context, data: note, statusCode: 201 });
};
