import { getBody } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as junkAiService from './junk-ai.service';
import { createJunkWithAiSchema } from './junk-ai.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';

export const createWithAi = async (context: Context<AppEnv>) => {
  const input = getBody(context, createJunkWithAiSchema);

  const junkItem = await junkAiService.createWithAi(input, context.get('ai_client'));

  return successResponse({ context, data: junkItem, statusCode: 201 });
};
