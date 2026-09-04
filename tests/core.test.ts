import { expect, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import { failureResponse, successResponse } from '../src/shared/response/api-response';

test('creates a success response without empty metadata', () => {
  expect(successResponse({ id: 'example' })).toEqual({
    success: true,
    data: { id: 'example' },
  });
});

test('creates an error response with a request ID', () => {
  expect(
    failureResponse(
      {
        code: 'EXAMPLE_ERROR',
        message: 'Example error',
        details: null,
      },
      'req_123',
    ),
  ).toEqual({
    success: false,
    error: {
      code: 'EXAMPLE_ERROR',
      message: 'Example error',
      details: null,
    },
    requestId: 'req_123',
  });
});

test('preserves typed application error properties', () => {
  const cause = new Error('database unavailable');
  const error = new AppError({
    code: 'DEPENDENCY_UNAVAILABLE',
    statusCode: 503,
    message: 'Dependency unavailable',
    cause,
  });

  expect(error).toBeInstanceOf(Error);
  expect(error.code).toBe('DEPENDENCY_UNAVAILABLE');
  expect(error.statusCode).toBe(503);
  expect(error.details).toBeNull();
  expect(error.cause).toBe(cause);
});
