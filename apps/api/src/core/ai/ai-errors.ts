import { AppError } from '../errors/app-error';

export const aiNotConfiguredError = (): AppError =>
  new AppError({ code: 'AI_NOT_CONFIGURED', statusCode: 503, message: 'AI feature is not configured.' });

export const aiUnavailableError = (): AppError =>
  new AppError({ code: 'AI_UNAVAILABLE', statusCode: 503, message: 'AI service is unavailable.' });

export const aiAuthFailedError = (): AppError =>
  new AppError({ code: 'AI_AUTH_FAILED', statusCode: 503, message: 'AI credentials were rejected.' });

export const aiRateLimitedError = (): AppError =>
  new AppError({ code: 'AI_RATE_LIMITED', statusCode: 503, message: 'AI provider rate limit reached.' });

export const aiConfigurationError = (): AppError =>
  new AppError({
    code: 'AI_CONFIGURATION_ERROR',
    statusCode: 503,
    message: 'AI provider rejected the request configuration.',
  });

export const aiInvalidResponseError = (): AppError =>
  new AppError({ code: 'AI_INVALID_RESPONSE', statusCode: 503, message: 'AI response could not be used.' });
