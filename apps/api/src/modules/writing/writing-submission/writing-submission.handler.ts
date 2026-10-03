import { getBody, getParam, getQuery } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as writingSubmissionService from './writing-submission.service';
import {
  createSubmissionSchema,
  listSubmissionsSchema,
  saveAnalysisSchema,
  submissionParamsSchema,
  updateSubmissionSchema,
} from './writing-submission.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';

export const createSubmission = async (context: Context<AppEnv>) => {
  const input = getBody(context, createSubmissionSchema);

  const result = await writingSubmissionService.createSubmission(input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const getSubmission = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);

  const result = await writingSubmissionService.getSubmission(params.code);

  return successResponse({ context, data: result });
};

export const getCorrectedText = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);

  const result = await writingSubmissionService.getCorrectedText(params.code);

  return successResponse({ context, data: result });
};

export const listSubmissions = async (context: Context<AppEnv>) => {
  const input = getQuery(context, listSubmissionsSchema);

  const result = await writingSubmissionService.listSubmissions(input);

  return successResponse({ context, data: result });
};

export const updateSubmission = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);
  const input = getBody(context, updateSubmissionSchema);

  const result = await writingSubmissionService.updateSubmission(params.code, input);

  return successResponse({ context, data: result });
};

export const saveAnalysis = async (context: Context<AppEnv>) => {
  const params = getParam(context, submissionParamsSchema);
  const input = getBody(context, saveAnalysisSchema);

  const result = await writingSubmissionService.saveAnalysis(params.code, input);

  return successResponse({ context, data: result });
};
