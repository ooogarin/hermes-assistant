import { z } from 'zod';
import { failureResponse } from '../../shared/response/api-response';
import { AppError } from '../errors/app-error';
import { appLogger } from '../logging/logger';
import type { ErrorHandler } from 'hono';
import type { AppEnv } from '../http/app-env';

const validationDetails = (error: z.ZodError): { fields: Array<{ path: string; message: string }> } => {
  return {
    fields: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
};

export const errorHandler: ErrorHandler<AppEnv> = (error, context) => {
  const requestId = context.get('requestId');

  if (error instanceof AppError) {
    appLogger.warning('Application request failed: {code} ({statusCode}) [requestId={requestId}]', {
      code: error.code,
      requestId,
      statusCode: error.statusCode,
    });

    return context.json(
      failureResponse(
        {
          code: error.code,
          message: error.message,
          details: error.exposeDetails ? error.details : null,
        },
        requestId,
      ),
      error.statusCode,
    );
  }

  if (error instanceof z.ZodError) {
    appLogger.warning('Request validation failed [requestId={requestId}]', { requestId });

    return context.json(
      failureResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationDetails(error),
        },
        requestId,
      ),
      400,
    );
  }

  appLogger.error('Unexpected request failure: {errorName} [requestId={requestId}]', {
    errorName: error.name,
    requestId,
  });

  return context.json(
    failureResponse(
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: null,
      },
      requestId,
    ),
    500,
  );
};
