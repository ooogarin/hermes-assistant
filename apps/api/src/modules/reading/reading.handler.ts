import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as readingService from './reading.service';
import {
  createMaterialSchema,
  listMaterialsSchema,
  materialCodeSchema,
  saveAnswersSchema,
  updateMaterialSchema,
} from './reading.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';

export const createMaterial = async (context: Context<AppEnv>) => {
  const input = getBody(context, createMaterialSchema);

  const result = await readingService.createMaterial(input);

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

export const saveAnswers = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const input = getBody(context, saveAnswersSchema);

  const result = await readingService.saveAnswers(params.code, input);

  return successResponse({ context, data: result });
};

export const getExpectedAnswers = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);

  const result = await readingService.getExpectedAnswers(params.code);

  return successResponse({ context, data: { items: result } });
};

export const updateMaterial = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const input = getBody(context, updateMaterialSchema);

  const result = await readingService.updateMaterial(params.code, input);

  return successResponse({ context, data: result });
};
