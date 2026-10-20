import { getBody, getParam, getQuery } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as writingMaterialService from './writing-material.service';
import { createMaterialSchema, listMaterialsSchema, materialCodeSchema } from './writing-material.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';
import type { WritingMaterialReferenceRequest } from './writing-material.types';

export const createMaterial = async (context: Context<AppEnv>) => {
  const input = getBody(context, createMaterialSchema);

  const result = await writingMaterialService.createMaterial(input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const listMaterials = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listMaterialsSchema);

  const result = await writingMaterialService.listMaterials(query);

  return successResponse({ context, data: result });
};

export const getMaterial = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const request: WritingMaterialReferenceRequest = { code: params.code };

  const result = await writingMaterialService.getMaterial(request);

  return successResponse({ context, data: result });
};
