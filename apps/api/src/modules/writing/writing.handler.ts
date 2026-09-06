import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as writingService from './writing.service';
import {
  createMaterialSchema,
  createSubmissionSchema,
  listMaterialsSchema,
  materialCodeSchema,
  submissionParamsSchema,
  updateSettingsSchema,
} from './writing.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';

export const getSettings = async (context: Context<AppEnv>) => {
  const result = await writingService.getSettings();

  return successResponse({ context, data: result });
};

export const updateSettings = async (context: Context<AppEnv>) => {
  const data = getBody(context, updateSettingsSchema);
  const result = await writingService.updateSettings(data);

  return successResponse({ context, data: result });
};

export const createMaterial = async (context: Context<AppEnv>) => {
  const data = getBody(context, createMaterialSchema);
  const result = await writingService.createMaterial(data);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const listMaterials = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listMaterialsSchema);
  const result = await writingService.listMaterials(query);

  return successResponse({ context, data: result });
};

export const getMaterial = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, materialCodeSchema);
  const result = await writingService.getMaterial(code);

  return successResponse({ context, data: result });
};

export const createSubmission = async (context: Context<AppEnv>) => {
  const { code } = getParam(context, materialCodeSchema);
  const data = getBody(context, createSubmissionSchema);
  const result = await writingService.createSubmission(code, data);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const getSubmission = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);
  const result = await writingService.getSubmission(params.code, params.submissionNumber);

  return successResponse({ context, data: result });
};

export const getCorrectedText = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);
  const result = await writingService.getCorrectedText(params.code, params.submissionNumber);

  return successResponse({ context, data: result });
};
