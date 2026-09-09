import { getBody, getParam } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as grammarService from './grammar.service';
import {
  createSessionSchema,
  evaluateSessionSchema,
  questionReferenceSchema,
  saveAnswerSchema,
  sessionCodeSchema,
  updateSettingsSchema,
} from './grammar.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';

export const getSettings = async (context: Context<AppEnv>) => {
  const result = await grammarService.getSettings();

  return successResponse({ context, data: result });
};

export const updateSettings = async (context: Context<AppEnv>) => {
  const data = getBody(context, updateSettingsSchema);

  const result = await grammarService.updateSettings(data);

  return successResponse({ context, data: result });
};

export const createSession = async (context: Context<AppEnv>) => {
  const data = getBody(context, createSessionSchema);

  const result = await grammarService.createSession(data);

  return successResponse({ context, data: result, statusCode: 201 });
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
  const data = getBody(context, saveAnswerSchema);
  const result = await grammarService.saveAnswer(params.code, params.question_number, data);

  return successResponse({ context, data: result });
};

export const getExplanation = async (context: Context<AppEnv>) => {
  const params = getParam(context, questionReferenceSchema);
  const result = await grammarService.getExplanation(params.code, params.question_number);

  return successResponse({ context, data: result });
};

export const evaluateSession = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const data = getBody(context, evaluateSessionSchema);
  const result = await grammarService.evaluateSession(params.code, data);

  return successResponse({ context, data: result });
};

export const getReport = async (context: Context<AppEnv>) => {
  const params = getParam(context, sessionCodeSchema);
  const result = await grammarService.getReport(params.code);

  return successResponse({ context, data: result });
};
