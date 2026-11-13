import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import { requireBrowser } from '../../../core/middleware/auth';
import * as junkAiHandler from './junk-ai.handler';
import { createJunkWithAiSchema } from './junk-ai.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createJunkAiRoutes = () => {
  const route = new Hono<AppEnv>();

  route.post('/', requireBrowser, appValidator('json', createJunkWithAiSchema), junkAiHandler.createWithAi);

  return route;
};
