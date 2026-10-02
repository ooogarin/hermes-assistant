import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as grammarHandler from './grammar.handler';
import {
  createSessionSchema,
  evaluateSessionSchema,
  listSessionsSchema,
  questionReferenceSchema,
  saveAnswerSchema,
  sessionCodeSchema,
} from './grammar.validator';
import { createGrammarSettingRoutes } from './grammar-setting/grammar-setting.route';
import type { AppEnv } from '../../core/http/app-env';

export const createGrammarRoutes = () => {
  const route = new Hono<AppEnv>();

  route.route('/settings', createGrammarSettingRoutes());
  route.post('/sessions', appValidator('json', createSessionSchema), grammarHandler.createSession);
  route.get('/sessions', appValidator('query', listSessionsSchema), grammarHandler.listSessions);
  route.get('/sessions/:code', appValidator('param', sessionCodeSchema), grammarHandler.getSession);
  route.delete('/sessions/:code', appValidator('param', sessionCodeSchema), grammarHandler.removeSession);
  route.put(
    '/sessions/:code/questions/:question_number/answer',
    appValidator('param', questionReferenceSchema),
    appValidator('json', saveAnswerSchema),
    grammarHandler.saveAnswer,
  );
  route.get(
    '/sessions/:code/questions/:question_number/explanation',
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
