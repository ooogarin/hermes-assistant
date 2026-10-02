import { z } from 'zod';
import type { WebAuthConfiguration } from '../auth/auth.types';

const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warning', 'error', 'fatal']);
const databaseUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;

  return protocol === 'postgres:' || protocol === 'postgresql:';
}, 'Must be a PostgreSQL URL.');
const internalApiKeySchema = z.string().trim().min(32).max(512);
const placeholderInternalApiKey = 'replace-with-a-long-random-secret';

const passwordHashSchema = z
  .string()
  .max(1_024)
  .refine((value) => {
    const parameters =
      /^\$argon2id\$v=19\$m=(\d{1,6}),t=(\d),p=(\d)\$[A-Za-z0-9+/]{8,128}\$[A-Za-z0-9+/]{16,128}$/.exec(value);

    if (parameters === null) {
      return false;
    }

    const memory = Number(parameters[1]);
    const iterations = Number(parameters[2]);
    const parallelism = Number(parameters[3]);
    const isMemoryOutOfRange = memory < 19_456 || memory > 65_536;
    const areIterationsOutOfRange = iterations < 2 || iterations > 4;
    const isParallelismOutOfRange = parallelism < 1 || parallelism > 4;

    if (isMemoryOutOfRange || areIterationsOutOfRange || isParallelismOutOfRange) {
      return false;
    }

    try {
      Bun.password.verifySync('hermes-auth-configuration-check', value);

      return true;
    } catch {
      return false;
    }
  }, 'Must be a valid Argon2id password hash with supported parameters.');

const webOriginSchema = z.url().refine((value) => {
  try {
    const url = new URL(value);
    const hasInvalidOrigin = url.origin !== value || url.username !== '' || url.password !== '';

    if (hasInvalidOrigin) {
      return false;
    }

    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    );
  } catch {
    return false;
  }
}, 'Must be an HTTPS origin or a local HTTP development origin.');

const databaseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: databaseUrlSchema,
  LOG_LEVEL: logLevelSchema.default('info'),
});

const environmentSchema = databaseEnvironmentSchema
  .extend({
    HOST: z.string().trim().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    INTERNAL_API_KEY: internalApiKeySchema,
    READINESS_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(2_000),
    WEB_AUTH_PASSWORD_HASH: passwordHashSchema,
    WEB_AUTH_ORIGIN: webOriginSchema,
    WEB_AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(300).max(604_800).default(604_800),
  })
  .superRefine((value, context) => {
    const usesProductionPlaceholder =
      value.NODE_ENV === 'production' && value.INTERNAL_API_KEY === placeholderInternalApiKey;

    if (usesProductionPlaceholder) {
      context.addIssue({
        code: 'custom',
        message: 'The placeholder API key cannot be used in production.',
        path: ['INTERNAL_API_KEY'],
      });
    }

    const requiresHttpsOrigin = value.NODE_ENV !== 'development' && !value.WEB_AUTH_ORIGIN.startsWith('https://');

    if (requiresHttpsOrigin) {
      context.addIssue({ code: 'custom', message: 'HTTPS is required.', path: ['WEB_AUTH_ORIGIN'] });
    }
  });

export class EnvironmentConfigurationError extends Error {
  readonly invalidKeys: readonly string[];

  constructor(invalidKeys: readonly string[]) {
    super(`Invalid environment configuration: ${invalidKeys.join(', ')}`);
    this.name = 'EnvironmentConfigurationError';
    this.invalidKeys = invalidKeys;
  }
}

export type DatabaseEnvironment = {
  nodeEnv: 'development' | 'staging' | 'production';
  databaseUrl: string;
  logLevel: z.infer<typeof logLevelSchema>;
};

export type Environment = DatabaseEnvironment & {
  host: string;
  port: number;
  internalApiKey: string;
  readinessTimeoutMs: number;
  webAuth: WebAuthConfiguration;
};

const parseEnvironment = <T>(schema: z.ZodType<T>, values: Record<string, string | undefined>): T => {
  const result = schema.safeParse(values);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join('.'))
      .filter((key, index, keys) => keys.indexOf(key) === index);

    throw new EnvironmentConfigurationError(invalidKeys);
  }

  return result.data;
};

export const loadDatabaseEnvironment = (values: Record<string, string | undefined>): DatabaseEnvironment => {
  const data = parseEnvironment(databaseEnvironmentSchema, values);

  return {
    nodeEnv: data.NODE_ENV,
    databaseUrl: data.DATABASE_URL,
    logLevel: data.LOG_LEVEL,
  };
};

export const loadEnvironment = (values: Record<string, string | undefined>): Environment => {
  const data = parseEnvironment(environmentSchema, values);

  return {
    nodeEnv: data.NODE_ENV,
    host: data.HOST,
    port: data.PORT,
    databaseUrl: data.DATABASE_URL,
    internalApiKey: data.INTERNAL_API_KEY,
    logLevel: data.LOG_LEVEL,
    readinessTimeoutMs: data.READINESS_TIMEOUT_MS,
    webAuth: {
      password_hash: data.WEB_AUTH_PASSWORD_HASH,
      origin: data.WEB_AUTH_ORIGIN,
      session_ttl_seconds: data.WEB_AUTH_SESSION_TTL_SECONDS,
      secure_cookie: data.WEB_AUTH_ORIGIN.startsWith('https://'),
    },
  };
};
