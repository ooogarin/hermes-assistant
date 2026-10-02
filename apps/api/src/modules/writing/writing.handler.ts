import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as writingService from './writing.service';
import {
  createMaterialSchema,
  createSubmissionSchema,
  listMaterialsSchema,
  materialCodeSchema,
  submissionParamsSchema,
} from './writing.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';

export const createMaterial = async (context: Context<AppEnv>) => {
  const input = getBody(context, createMaterialSchema);

  const result = await writingService.createMaterial(input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const listMaterials = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listMaterialsSchema);

  const result = await writingService.listMaterials(query);

  return successResponse({ context, data: result });
};

export const getMaterial = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);

  const result = await writingService.getMaterial(params.code);

  return successResponse({ context, data: result });
};

export const createSubmission = async (context: Context<AppEnv>) => {
  const params = getParam(context, materialCodeSchema);
  const input = getBody(context, createSubmissionSchema);

  const result = await writingService.createSubmission(params.code, input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const getSubmission = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);

  const result = await writingService.getSubmission(params.code, params.submission_number);

  return successResponse({ context, data: result });
};

export const getCorrectedText = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);

  const result = await writingService.getCorrectedText(params.code, params.submission_number);

  return successResponse({ context, data: result });
};
