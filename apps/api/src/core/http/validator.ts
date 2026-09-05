import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { failureResponse } from './response';
import type { Context, MiddlewareHandler, Next } from 'hono';
import type { AppEnv } from './app-env';

export const appValidator = ((target: Parameters<typeof zValidator>[0], schema: Parameters<typeof zValidator>[1]) => {
  const validator = zValidator(target, schema, (result, context) => {
    if (result.success) {
      return;
    }

    return failureResponse({
      context: context as Context<AppEnv>,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      statusCode: 400,
    });
  }) as unknown as MiddlewareHandler<AppEnv>;

  return async (context: Context<AppEnv>, next: Next) => {
    try {
      return await validator(context, next);
    } catch (error) {
      if (
        target === 'json' &&
        (error instanceof SyntaxError || (error instanceof HTTPException && error.status === 400))
      ) {
        return failureResponse({
          context: context as Context<AppEnv>,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: null,
          },
          statusCode: 400,
        });
      }

      throw error;
    }
  };
}) as typeof zValidator;
