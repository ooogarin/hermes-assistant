import { z } from 'zod';

const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warning', 'error', 'fatal']);
const databaseUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;

  return protocol === 'postgres:' || protocol === 'postgresql:';
}, 'Must be a PostgreSQL URL.');
const internalApiKeySchema = z.string().trim().min(32).max(512);
const placeholderInternalApiKey = 'replace-with-a-long-random-secret';

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
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.INTERNAL_API_KEY === placeholderInternalApiKey) {
      context.addIssue({
        code: 'custom',
        message: 'The placeholder API key cannot be used in production.',
        path: ['INTERNAL_API_KEY'],
      });
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
  };
};
