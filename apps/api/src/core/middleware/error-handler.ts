import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { AppError } from '../errors/app-error';
import { failureResponse, validationErrorBody } from '../http/response';
import { appLogger } from '../logging/logger';
import type { ErrorHandler } from 'hono';
import type { AppEnv } from '../http/app-env';

const httpErrorBody = (statusCode: number): { code: string; message: string } => {
  switch (statusCode) {
    case 400:
      return { code: 'BAD_REQUEST', message: 'Bad request' };
    case 401:
      return { code: 'UNAUTHENTICATED', message: 'Authentication required' };
    case 403:
      return { code: 'FORBIDDEN', message: 'Access forbidden' };
    case 404:
      return { code: 'NOT_FOUND', message: 'Resource not found' };
    case 409:
      return { code: 'CONFLICT', message: 'Request conflict' };
    case 413:
      return { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' };
    case 415:
      return { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported media type' };
    case 429:
      return { code: 'RATE_LIMITED', message: 'Too many requests' };
    case 500:
      return { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' };
    case 503:
      return { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' };
    default:
      return { code: 'HTTP_ERROR', message: 'Request failed' };
  }
};

export const errorHandler: ErrorHandler<AppEnv> = (error, context) => {
  const requestId = context.get('requestId');

  if (error instanceof AppError) {
    const logProperties = {
      code: error.code,
      message: error.message,
      requestId,
      statusCode: error.statusCode,
    };

    if (error.statusCode >= 500) {
      appLogger.error(
        'Application request failed: {code} ({statusCode}): {message} [requestId={requestId}]',
        logProperties,
      );
    } else {
      appLogger.warning(
        'Application request failed: {code} ({statusCode}): {message} [requestId={requestId}]',
        logProperties,
      );
    }

    return failureResponse({
      context,
      error: {
        code: error.code,
        message: error.message,
        details: error.exposeDetails ? error.details : null,
      },
      statusCode: error.statusCode,
    });
  }

  if (error instanceof z.ZodError) {
    const failedFields = error.issues.map((issue) => issue.path.join('.')).join(', ');

    appLogger.warning('Request validation failed: {failedFields} [requestId={requestId}]', {
      failedFields,
      requestId,
    });

    return failureResponse({
      context,
      error: validationErrorBody(error),
      statusCode: 400,
    });
  }

  if (error instanceof HTTPException) {
    const statusCode = error.status >= 400 && error.status <= 599 ? error.status : 500;
    const responseError = httpErrorBody(statusCode);

    const logProperties = { requestId, statusCode };

    if (statusCode >= 500) {
      appLogger.error('HTTP request failed: {statusCode} [requestId={requestId}]', logProperties);
    } else {
      appLogger.warning('HTTP request failed: {statusCode} [requestId={requestId}]', logProperties);
    }

    return failureResponse({
      context,
      error: { ...responseError, details: null },
      statusCode,
    });
  }

  const errorMessage = error instanceof Error ? error.message : '';
  const errorLike = error as unknown as { code?: unknown };
  const errorCode = typeof errorLike.code === 'string' ? errorLike.code : '';

  appLogger.error(
    'Unexpected request failure: {errorName}: {errorMessage} [code={errorCode}] [requestId={requestId}]',
    { errorName: error.name, errorMessage, errorCode, requestId },
  );

  return failureResponse({
    context,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: null,
    },
    statusCode: 500,
  });
};
