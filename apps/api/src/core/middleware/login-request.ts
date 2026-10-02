import { z } from 'zod';
import { AppError } from '../errors/app-error';
import type { MiddlewareHandler } from 'hono';
import type { LoginLimiter } from '../auth/auth.types';
import type { AppEnv } from '../http/app-env';

const maximumBodyBytes = 4_096;
const jsonContentTypeSchema = z
  .string()
  .transform((value) => value.split(';')[0]?.trim().toLowerCase())
  .pipe(z.literal('application/json'));

export const createLoginAttemptMiddleware = (limiter: LoginLimiter): MiddlewareHandler<AppEnv> => {
  return async (context, next) => {
    const retryAfter = limiter.admitAttempt();

    if (retryAfter !== undefined) {
      context.header('Retry-After', String(retryAfter));

      throw new AppError({ code: 'RATE_LIMITED', message: 'Too many login attempts', statusCode: 429 });
    }

    await next();
  };
};

export const createLoginVerificationMiddleware = (limiter: LoginLimiter): MiddlewareHandler<AppEnv> => {
  return async (context, next) => {
    if (!limiter.acquireVerification()) {
      context.header('Retry-After', '1');

      throw new AppError({ code: 'RATE_LIMITED', message: 'Login verification busy', statusCode: 429 });
    }

    try {
      await next();
    } finally {
      limiter.releaseVerification();
    }
  };
};

export const loginBodyMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const contentType = jsonContentTypeSchema.safeParse(context.req.header('Content-Type'));

  if (!contentType.success) {
    throw new AppError({ code: 'UNSUPPORTED_MEDIA_TYPE', message: 'JSON body required', statusCode: 415 });
  }

  const reader = context.req.raw.body?.getReader();

  if (reader !== undefined) {
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        totalBytes += value.byteLength;

        if (totalBytes > maximumBodyBytes) {
          void reader.cancel().catch(() => undefined);

          throw new AppError({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large', statusCode: 413 });
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Count the actual stream, including when Content-Length is absent or inaccurate.
    const body = new Uint8Array(totalBytes);
    let offset = 0;

    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }

    context.req.raw = new Request(context.req.raw, { body });
  }

  await next();
};
