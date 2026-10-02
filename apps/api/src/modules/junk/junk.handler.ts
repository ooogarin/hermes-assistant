import { getBody, getParam, getQuery } from '../../core/http/request';
import { successResponse } from '../../core/http/response';
import * as junkService from './junk.service';
import { createJunkSchema, junkCodeSchema, searchJunkSchema, updateJunkSchema } from './junk.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../core/http/app-env';
import type { JunkReferenceRequest } from './junk.types';

export const create = async (context: Context<AppEnv>) => {
  const input = getBody(context, createJunkSchema);

  const result = await junkService.create(input);

  return successResponse({ context, data: result, statusCode: 201 });
};

export const getDetail = async (context: Context<AppEnv>) => {
  const params = getParam(context, junkCodeSchema);
  const request: JunkReferenceRequest = { code: params.code };

  const result = await junkService.getDetail(request);

  return successResponse({ context, data: result });
};

export const list = async (context: Context<AppEnv>) => {
  const query = getQuery(context, searchJunkSchema);

  const result = await junkService.list(query);

  return successResponse({ context, data: { items: result } });
};

export const update = async (context: Context<AppEnv>) => {
  const params = getParam(context, junkCodeSchema);
  const input = getBody(context, updateJunkSchema);
  const request: JunkReferenceRequest = { code: params.code };

  const result = await junkService.update(request, input);

  return successResponse({ context, data: result });
};

export const remove = async (context: Context<AppEnv>) => {
  const params = getParam(context, junkCodeSchema);
  const request: JunkReferenceRequest = { code: params.code };

  await junkService.remove(request);

  return context.body(null, 204);
};
