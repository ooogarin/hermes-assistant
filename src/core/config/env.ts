import { z } from 'zod';

const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warning', 'error', 'fatal']);

const databaseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url(),
  LOG_LEVEL: logLevelSchema.default('info'),
});

const environmentSchema = databaseEnvironmentSchema.extend({
  INTERNAL_API_KEY: z.string().min(1),
});

export type DatabaseEnvironment = {
  nodeEnv: 'development' | 'staging' | 'production';
  host: string;
  port: number;
  databaseUrl: string;
  logLevel: z.infer<typeof logLevelSchema>;
};

export type Environment = DatabaseEnvironment & {
  internalApiKey: string;
};

export const loadDatabaseEnvironment = (values: Record<string, string | undefined>): DatabaseEnvironment => {
  const result = databaseEnvironmentSchema.safeParse(values);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join('.'))
      .filter((key, index, keys) => keys.indexOf(key) === index)
      .join(', ');

    throw new Error(`Invalid environment configuration: ${invalidKeys}`);
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    host: result.data.HOST,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    logLevel: result.data.LOG_LEVEL,
  };
};

export const loadEnvironment = (values: Record<string, string | undefined>): Environment => {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const invalidKeys = result.error.issues
      .map((issue) => issue.path.join('.'))
      .filter((key, index, keys) => keys.indexOf(key) === index)
      .join(', ');

    throw new Error(`Invalid environment configuration: ${invalidKeys}`);
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    host: result.data.HOST,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    internalApiKey: result.data.INTERNAL_API_KEY,
    logLevel: result.data.LOG_LEVEL,
  };
};
