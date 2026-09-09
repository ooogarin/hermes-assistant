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
  return successResponse({ context, data: await grammarService.getSettings() });
};

export const updateSettings = async (context: Context<AppEnv>) => {
  const data = getBody(context, updateSettingsSchema);

  return successResponse({ context, data: await grammarService.updateSettings(data) });
};

export const createSession = async (context: Context<AppEnv>) => {
  const data = getBody(context, createSessionSchema);

  return successResponse({ context, data: await grammarService.createSession(data), statusCode: 201 });
};

export const getSession = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, sessionCodeSchema);

  return successResponse({ context, data: await grammarService.getSession(code) });
};

export const removeSession = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, sessionCodeSchema);

  await grammarService.removeSession(code);

  return context.body(null, 204);
};

export const saveAnswer = async (context: Context<AppEnv>) => {
  const { code, question_number } = getParam(context, questionReferenceSchema);
  const data = getBody(context, saveAnswerSchema);

  return successResponse({ context, data: await grammarService.saveAnswer(code, question_number, data) });
};

export const getExplanation = async (context: Context<AppEnv>) => {
  const { code, question_number } = getParam(context, questionReferenceSchema);

  return successResponse({ context, data: await grammarService.getExplanation(code, question_number) });
};

export const evaluateSession = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, sessionCodeSchema);
  const data = getBody(context, evaluateSessionSchema);

  return successResponse({ context, data: await grammarService.evaluateSession(code, data) });
};

export const getReport = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, sessionCodeSchema);

  return successResponse({ context, data: await grammarService.getReport(code) });
};
