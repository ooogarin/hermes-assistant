import { expect, test } from 'bun:test';
import { createApp } from '../src/app';

test('creates an app that can handle a request without a listening server', async () => {
  const response = await createApp({
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  }).request('http://localhost/');

  expect(response.status).toBe(404);
});
