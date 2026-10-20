import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as grammarService from './grammar.service';
import {
  createSessionSchema,
  evaluateSessionSchema,
  listSessionsSchema,
  questionReferenceSchema,
  saveAnswersSchema,
  sessionCodeSchema,
} from './grammar.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { GrammarQuestionReferenceRequest, GrammarSessionReferenceRequest } from './grammar.types';

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
  const request: GrammarSessionReferenceRequest = { code: params.code };

  const result = await grammarService.getSession(request);

  return successResponse({ context, data: result });
};

export const removeSession = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const request: GrammarSessionReferenceRequest = { code: params.code };

  await grammarService.removeSession(request);

  return context.body(null, 204);
};

export const saveAnswers = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const input = getBody(context, saveAnswersSchema);
  const request: GrammarSessionReferenceRequest = { code: params.code };

  const result = await grammarService.saveAnswers(request, input);

  return successResponse({ context, data: result });
};

export const getExplanation = async (context: Context<AppEnv>) => {
  const params = getParam(context, questionReferenceSchema);
  const request: GrammarQuestionReferenceRequest = {
    code: params.code,
    question_number: params.question_number,
  };

  const result = await grammarService.getExplanation(request);

  return successResponse({ context, data: result });
};

export const evaluateSession = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const input = getBody(context, evaluateSessionSchema);
  const request: GrammarSessionReferenceRequest = { code: params.code };

  const result = await grammarService.evaluateSession(request, input);

  return successResponse({ context, data: result });
};

export const getReport = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const request: GrammarSessionReferenceRequest = { code: params.code };

  const result = await grammarService.getReport(request);

  return successResponse({ context, data: result });
};
