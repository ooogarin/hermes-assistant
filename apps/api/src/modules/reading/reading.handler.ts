import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as readingService from './reading.service';
import {
  createMaterialSchema,
  listMaterialsSchema,
  materialCodeSchema,
  saveSubmissionSchema,
  updateSettingsSchema,
} from './reading.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';

export const getSettings = async (context: Context<AppEnv>) => {
  const result = await readingService.getSettings();

  return successResponse({ context, data: result });
};

export const updateSettings = async (context: Context<AppEnv>) => {
  const data = getBody(context, updateSettingsSchema);
  const result = await readingService.updateSettings(data);

  return successResponse({ context, data: result });
};

export const createMaterial = async (context: Context<AppEnv>) => {
  const data = getBody(context, createMaterialSchema);
  const result = await readingService.createMaterial(data);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const listMaterials = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listMaterialsSchema);
  const result = await readingService.listMaterials(query);

  return successResponse({ context, data: result });
};

export const getMaterial = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const result = await readingService.getMaterial(params.code);

  return successResponse({ context, data: result });
};

export const saveSubmission = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const data = getBody(context, saveSubmissionSchema);
  const result = await readingService.saveSubmission(params.code, data);

  return successResponse({ context, data: result });
};

export const getExpectedAnswers = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const result = await readingService.getExpectedAnswers(params.code);

  return successResponse({ context, data: { items: result } });
};
