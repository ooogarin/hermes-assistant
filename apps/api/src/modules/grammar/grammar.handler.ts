import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as grammarService from './grammar.service';
import {
  createSessionSchema,
  evaluateSessionSchema,
  listSessionsSchema,
  questionReferenceSchema,
  saveAnswerSchema,
  sessionCodeSchema,
} from './grammar.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';

export const createSession = async (context: Context<AppEnv>) => {
  const input = getBody(context, createSessionSchema);

  const result = await grammarService.createSession(input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const listSessions = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listSessionsSchema);

  const result = await grammarService.listSessions(query);

  return successResponse({ context, data: result });
};

export const getSession = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);

  const result = await grammarService.getSession(params.code);

  return successResponse({ context, data: result });
};

export const removeSession = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, sessionCodeSchema);

  await grammarService.removeSession(code);

  return context.body(null, 204);
};

export const saveAnswer = async (context: Context<AppEnv>) => {
  const params = getParam(context, questionReferenceSchema);
  const input = getBody(context, saveAnswerSchema);

  const result = await grammarService.saveAnswer(params.code, params.question_number, input);

  return successResponse({ context, data: result });
};

export const getExplanation = async (context: Context<AppEnv>) => {
  const params = getParam(context, questionReferenceSchema);

  const result = await grammarService.getExplanation(params.code, params.question_number);

  return successResponse({ context, data: result });
};

export const evaluateSession = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const input = getBody(context, evaluateSessionSchema);

  const result = await grammarService.evaluateSession(params.code, input);

  return successResponse({ context, data: result });
};

export const getReport = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);

  const result = await grammarService.getReport(params.code);

  return successResponse({ context, data: result });
};
