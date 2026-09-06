import { afterEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest } from './api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  test('validates and returns data from a success envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { code: 'NT-20260906-001' } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    const data = await apiRequest('/api/v1/notes/NT-20260906-001', z.object({ code: z.string() }));

    expect(data).toEqual({ code: 'NT-20260906-001' });
  });

  test('maps a valid API error envelope to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', details: null },
            request_id: 'req_123',
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 404 },
        ),
      ),
    );

    const request = apiRequest('/api/v1/notes/missing', z.object({ code: z.string() }));

    await expect(request).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      requestId: 'req_123',
      status: 404,
    });
  });

  test('rejects a success response whose data violates the feature schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { code: 123 } }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }),
      ),
    );

    const request = apiRequest('/api/v1/notes/invalid', z.object({ code: z.string() }));

    await expect(request).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 });
  });

  test('supports successful responses without a body when the schema expects void', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest('/api/v1/notes/NT-20260906-001', z.void(), { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
