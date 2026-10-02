import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EnvironmentConfigurationError, loadDatabaseEnvironment, loadEnvironment } from '../src/core/config/env';
import { testWebAuth } from './fixtures/auth';

const validApiKey = 'test-api-key-with-at-least-32-characters';
const validEnvironment = {
  DATABASE_URL: 'postgres://localhost:5432/hermes',
  INTERNAL_API_KEY: validApiKey,
  WEB_AUTH_PASSWORD_HASH: testWebAuth.password_hash,
  WEB_AUTH_ORIGIN: testWebAuth.origin,
  WEB_AUTH_JWT_SECRET: testWebAuth.jwt_secret,
};

test('loads validated environment with defaults', () => {
  expect(loadEnvironment(validEnvironment)).toEqual({
    nodeEnv: 'development',
    host: '127.0.0.1',
    port: 3000,
    databaseUrl: 'postgres://localhost:5432/hermes',
    internalApiKey: validApiKey,
    logLevel: 'info',
    readinessTimeoutMs: 2_000,
    webAuth: testWebAuth,
  });
});

test('accepts staging environment', () => {
  expect(
    loadEnvironment({
      ...validEnvironment,
      NODE_ENV: 'staging',
    }).nodeEnv,
  ).toBe('staging');
});

test('rejects missing internal API key without exposing values', () => {
  expect(() => loadEnvironment({ ...validEnvironment, INTERNAL_API_KEY: undefined })).toThrow('INTERNAL_API_KEY');
});

test('rejects missing database URL without exposing values', () => {
  expect(() => loadEnvironment({ ...validEnvironment, DATABASE_URL: undefined })).toThrow('DATABASE_URL');
});

test('rejects a non-PostgreSQL database URL', () => {
  expect(() => loadEnvironment({ ...validEnvironment, DATABASE_URL: 'https://example.com/hermes' })).toThrow(
    'DATABASE_URL',
  );
});

test('rejects a short internal API key', () => {
  expect(() => loadEnvironment({ ...validEnvironment, INTERNAL_API_KEY: 'too-short' })).toThrow('INTERNAL_API_KEY');
});

test('rejects the documented placeholder API key in production', () => {
  expect(() =>
    loadEnvironment({
      ...validEnvironment,
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

test('accepts a loopback HTTP origin only in development', () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173']) {
    expect(loadEnvironment({ ...validEnvironment, WEB_AUTH_ORIGIN: origin }).webAuth.secure_cookie).toBe(false);
    for (const nodeEnv of ['staging', 'production']) {
      expect(() => loadEnvironment({ ...validEnvironment, WEB_AUTH_ORIGIN: origin, NODE_ENV: nodeEnv })).toThrow(
        'WEB_AUTH_ORIGIN',
      );
    }
  }
});

test('rejects missing required settings without exposing configured values', () => {
  for (const key of [
    'DATABASE_URL',
    'INTERNAL_API_KEY',
    'WEB_AUTH_PASSWORD_HASH',
    'WEB_AUTH_ORIGIN',
    'WEB_AUTH_JWT_SECRET',
  ]) {
    try {
      loadEnvironment({ ...validEnvironment, [key]: undefined });
      throw new Error('Expected invalid configuration');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentConfigurationError);
      expect((error as EnvironmentConfigurationError).invalidKeys).toContain(key);
      expect((error as Error).message).not.toContain(validApiKey);
      expect((error as Error).message).not.toContain(testWebAuth.password_hash);
      expect((error as Error).message).not.toContain(testWebAuth.jwt_secret);
    }
  }
});

test('rejects plaintext, malformed, unsupported, or excessive-cost password hashes', () => {
  for (const passwordHash of [
    'a-plain-password-must-not-be-accepted',
    testWebAuth.password_hash.replace('$argon2id$', '$argon2i$'),
    testWebAuth.password_hash.replace('m=19456', 'm=999999'),
    testWebAuth.password_hash.replace('t=2', 't=9'),
    testWebAuth.password_hash.replace('m=19456', 'm=8'),
    testWebAuth.password_hash.replace(/\$[^$]+$/, '$x'),
    testWebAuth.password_hash.replace(/\$[^$]+\$([^$]+)$/, (_match, hash: string) => `$aaaaaaaaa$${hash}`),
  ]) {
    expect(() => loadEnvironment({ ...validEnvironment, WEB_AUTH_PASSWORD_HASH: passwordHash })).toThrow(
      'WEB_AUTH_PASSWORD_HASH',
    );
  }
});

test('requires an exact browser origin with no path, credentials, query, or fragment', () => {
  for (const origin of [
    'not a URL',
    'null',
    'https://hermes.example.com/',
    'https://hermes.example.com/login',
    'https://owner:secret@hermes.example.com',
    'https://hermes.example.com?x=1',
    'https://hermes.example.com#login',
    'http://hermes.example.com',
    'ftp://hermes.example.com',
  ]) {
    expect(() => loadEnvironment({ ...validEnvironment, WEB_AUTH_ORIGIN: origin })).toThrow('WEB_AUTH_ORIGIN');
  }
});

test('requires a 32-byte JWT signing secret encoded as lowercase hex', () => {
  for (const secret of ['', 'short', 'g'.repeat(64), 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65)]) {
    expect(() => loadEnvironment({ ...validEnvironment, WEB_AUTH_JWT_SECRET: secret })).toThrow('WEB_AUTH_JWT_SECRET');
  }
});

test('preserves the configured PHC hash when loaded from an escaped Bun dotenv value', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hermes-auth-env-test-'));

  try {
    const envFile = join(directory, '.env.auth-check');
    const escapedHash = testWebAuth.password_hash.replaceAll('$', '\\$');
    await writeFile(envFile, `HERMES_HASH_DOTENV_TEST='${escapedHash}'\n`, { mode: 0o600 });
    const child = Bun.spawn({
      cmd: [
        process.execPath,
        `--env-file=${envFile}`,
        '-e',
        'console.log(Bun.env.HERMES_HASH_DOTENV_TEST === Bun.env.HERMES_EXPECTED_HASH_TEST)',
      ],
      env: { ...process.env, HERMES_EXPECTED_HASH_TEST: testWebAuth.password_hash },
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const output = await new Response(child.stdout).text();
    expect(await child.exited).toBe(0);
    expect(output.trim()).toBe('true');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
