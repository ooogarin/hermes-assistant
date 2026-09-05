import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as grammarHandler from './grammar.handler';
import {
  createSessionSchema,
  evaluateSessionSchema,
  questionReferenceSchema,
  saveAnswerSchema,
  sessionCodeSchema,
  updateSettingsSchema,
} from './grammar.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createGrammarRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/settings', grammarHandler.getSettings);
  route.patch('/settings', appValidator('json', updateSettingsSchema), grammarHandler.updateSettings);
  route.post('/sessions', appValidator('json', createSessionSchema), grammarHandler.createSession);
  route.get('/sessions/:code', appValidator('param', sessionCodeSchema), grammarHandler.getSession);
  route.delete('/sessions/:code', appValidator('param', sessionCodeSchema), grammarHandler.removeSession);
  route.put(
    '/sessions/:code/questions/:questionNumber/answer',
    appValidator('param', questionReferenceSchema),
    appValidator('json', saveAnswerSchema),
    grammarHandler.saveAnswer,
  );
  route.get(
    '/sessions/:code/questions/:questionNumber/explanation',
    appValidator('param', questionReferenceSchema),
    grammarHandler.getExplanation,
  );
  route.post(
    '/sessions/:code/evaluate',
    appValidator('param', sessionCodeSchema),
    appValidator('json', evaluateSessionSchema),
    grammarHandler.evaluateSession,
  );
  route.get('/sessions/:code/report', appValidator('param', sessionCodeSchema), grammarHandler.getReport);

  return route;
};
