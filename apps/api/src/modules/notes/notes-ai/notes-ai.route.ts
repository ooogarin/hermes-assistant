import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import { requireBrowser } from '../../../core/middleware/auth';
import * as notesAiHandler from './notes-ai.handler';
import { createNotesWithAiSchema } from './notes-ai.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createNotesAiRoutes = () => {
  const route = new Hono<AppEnv>();

  route.post('/', requireBrowser, appValidator('json', createNotesWithAiSchema), notesAiHandler.createWithAi);

  return route;
};
