import { zValidator } from '@hono/zod-validator';
import { HTTPException } from 'hono/http-exception';
import { failureResponse, validationErrorBody } from './response';
import type { Context, MiddlewareHandler, Next } from 'hono';
import type { AppEnv } from './app-env';

export const appValidator = ((target: Parameters<typeof zValidator>[0], schema: Parameters<typeof zValidator>[1]) => {
  const validator = zValidator(target, schema, (result, context) => {
    if (result.success) {
      return;
    }

    return failureResponse({
      context: context as Context<AppEnv>,
      error: validationErrorBody(result.error),
      statusCode: 400,
    });
  }) as unknown as MiddlewareHandler<AppEnv>;

  return async (context: Context<AppEnv>, next: Next) => {
    try {
      return await validator(context, next);
    } catch (error) {
      const isInvalidJson =
        target === 'json' && (error instanceof SyntaxError || (error instanceof HTTPException && error.status === 400));

      if (isInvalidJson) {
        return failureResponse({
          context: context as Context<AppEnv>,
          error: validationErrorBody(null),
          statusCode: 400,
        });
      }

      throw error;
    }
  };
}) as typeof zValidator;
