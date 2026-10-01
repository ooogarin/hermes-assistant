import { expect, test } from 'bun:test';
import { createApp } from '../src/app';
import { testWebAuth } from './fixtures/auth';

test('creates an app that can handle a request without a listening server', async () => {
  const response = await createApp({
    webAuth: testWebAuth,
    internalApiKey: 'test-api-key',
    isDatabaseReady: async () => true,
  }).request('http://localhost/');

  expect(response.status).toBe(404);
});
