import { createFailureResponse, createSuccessResponse } from '../../shared/response/api-response';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { ApiErrorBody, ApiMeta } from '../../shared/response/api-response';
import type { AppEnv } from './app-env';

export const successResponse = <T>({
  context,
  data,
  meta,
  statusCode = 200,
}: {
  context: Context<AppEnv>;
  data: T;
  meta?: ApiMeta;
  statusCode?: ContentfulStatusCode;
}) => context.json(createSuccessResponse(data, meta), statusCode);

export const failureResponse = ({
  context,
  error,
  statusCode,
}: {
  context: Context<AppEnv>;
  error: ApiErrorBody;
  statusCode: ContentfulStatusCode;
}) => context.json(createFailureResponse(error, context.get('requestId')), statusCode);
