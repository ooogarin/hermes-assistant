import { expect, test } from 'bun:test';
import { AppError } from '../src/core/errors/app-error';
import { createFailureResponse, createSuccessResponse, toSnakeCaseJson } from '../src/shared/response/api-response';

test('creates a success response without empty metadata', () => {
  expect(
    createSuccessResponse(
      {
        created_at: '2026-09-06T10:00:00.000Z',
        nestedItems: [{ source_reference: 'RD-20260906-001' }],
      },
      { pageSize: 20 },
    ),
  ).toEqual({
    success: true,
    data: {
      created_at: '2026-09-06T10:00:00.000Z',
      nested_items: [{ source_reference: 'RD-20260906-001' }],
    },
    meta: { page_size: 20 },
  });
});

test('creates an error response with a request ID', () => {
  expect(
    createFailureResponse(
      {
        code: 'EXAMPLE_ERROR',
        message: 'Example error',
        details: { fieldName: 'created_at' },
      },
      'req_123',
    ),
  ).toEqual({
    success: false,
    error: {
      code: 'EXAMPLE_ERROR',
      message: 'Example error',
      details: { field_name: 'created_at' },
    },
    request_id: 'req_123',
  });
});

test('preserves non-plain JSON values while converting object keys', () => {
  const created_at = new Date('2026-09-06T10:00:00.000Z');

  expect(createSuccessResponse({ created_at })).toEqual({
    success: true,
    data: { created_at: created_at },
  });
});

test('converts acronym-heavy keys with the runtime converter', () => {
  // The type-level converter only models camelCase keys; acronyms are exercised through the runtime path.
  const input: Record<string, unknown> = { HTTPResponse: 'ok', userID: 7, URL: 'x' };

  expect(toSnakeCaseJson(input)).toEqual({ http_response: 'ok', user_id: 7, url: 'x' });
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
