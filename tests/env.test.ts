import { expect, test } from 'bun:test';
import { loadDatabaseEnvironment, loadEnvironment } from '../src/core/config/env';

const validApiKey = 'test-api-key-with-at-least-32-characters';

test('loads validated environment with defaults', () => {
  expect(loadEnvironment({ DATABASE_URL: 'postgres://localhost:5432/hermes', INTERNAL_API_KEY: validApiKey })).toEqual({
    nodeEnv: 'development',
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: 'postgres://localhost:5432/hermes',
    internalApiKey: validApiKey,
    logLevel: 'info',
    readinessTimeoutMs: 2_000,
  });
});

test('accepts staging environment', () => {
  expect(
    loadEnvironment({
      DATABASE_URL: 'postgres://localhost:5432/hermes',
      INTERNAL_API_KEY: validApiKey,
      NODE_ENV: 'staging',
    }).nodeEnv,
  ).toBe('staging');
});

test('rejects missing internal API key without exposing values', () => {
  expect(() => loadEnvironment({ DATABASE_URL: 'postgres://localhost:5432/hermes' })).toThrow('INTERNAL_API_KEY');
});

test('rejects missing database URL without exposing values', () => {
  expect(() => loadEnvironment({ INTERNAL_API_KEY: validApiKey })).toThrow('DATABASE_URL');
});

test('rejects a non-PostgreSQL database URL', () => {
  expect(() => loadEnvironment({ DATABASE_URL: 'https://example.com/hermes', INTERNAL_API_KEY: validApiKey })).toThrow(
    'DATABASE_URL',
  );
});

test('rejects a short internal API key', () => {
  expect(() =>
    loadEnvironment({ DATABASE_URL: 'postgres://localhost:5432/hermes', INTERNAL_API_KEY: 'too-short' }),
  ).toThrow('INTERNAL_API_KEY');
});

test('rejects the documented placeholder API key in production', () => {
  expect(() =>
    loadEnvironment({
      DATABASE_URL: 'postgres://localhost:5432/hermes',
      INTERNAL_API_KEY: 'replace-with-a-long-random-secret',
      NODE_ENV: 'production',
    }),
  ).toThrow('INTERNAL_API_KEY');
});

test('loads database configuration without requiring an API key', () => {
  expect(
    loadDatabaseEnvironment({ DATABASE_URL: 'postgresql://localhost:5432/hermes', HOST: '', PORT: 'invalid' }),
  ).toEqual({
    nodeEnv: 'development',
    databaseUrl: 'postgresql://localhost:5432/hermes',
    logLevel: 'info',
  });
});
