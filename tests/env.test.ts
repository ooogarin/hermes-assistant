import { expect, test } from 'bun:test';
import { loadDatabaseEnvironment, loadEnvironment } from '../src/core/config/env';

test('loads validated environment with defaults', () => {
  expect(
    loadEnvironment({ DATABASE_URL: 'postgres://localhost:5432/hermes', INTERNAL_API_KEY: 'test-api-key' }),
  ).toEqual({
    nodeEnv: 'development',
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: 'postgres://localhost:5432/hermes',
    internalApiKey: 'test-api-key',
    logLevel: 'info',
  });
});

test('accepts staging environment', () => {
  expect(
    loadEnvironment({
      DATABASE_URL: 'postgres://localhost:5432/hermes',
      INTERNAL_API_KEY: 'test-api-key',
      NODE_ENV: 'staging',
    }).nodeEnv,
  ).toBe('staging');
});

test('rejects missing internal API key without exposing values', () => {
  expect(() => loadEnvironment({ DATABASE_URL: 'postgres://localhost:5432/hermes' })).toThrow('INTERNAL_API_KEY');
});

test('rejects missing database URL without exposing values', () => {
  expect(() => loadEnvironment({ INTERNAL_API_KEY: 'test-api-key' })).toThrow('DATABASE_URL');
});

test('loads database configuration without requiring an API key', () => {
  expect(loadDatabaseEnvironment({ DATABASE_URL: 'postgres://localhost:5432/hermes' })).toEqual({
    nodeEnv: 'development',
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: 'postgres://localhost:5432/hermes',
    logLevel: 'info',
  });
});
