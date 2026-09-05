import { AsyncLocalStorage } from 'node:async_hooks';
import { configure, getConsoleSink, getLogger } from '@logtape/logtape';
import { redactByField } from '@logtape/redaction';
import type { LogRecord } from '@logtape/logtape';
import type { DatabaseEnvironment } from '../config/env';

const jsonConsoleFormatter = (record: LogRecord): readonly unknown[] => [JSON.stringify(record)];

export const appLogger = getLogger(['hermes', 'app']);
export const httpLogger = getLogger(['hermes', 'http']);

export const configureLogging = async (
  environment: Pick<DatabaseEnvironment, 'nodeEnv' | 'logLevel'>,
): Promise<void> => {
  const consoleSink = getConsoleSink(environment.nodeEnv === 'production' ? { formatter: jsonConsoleFormatter } : {});

  await configure({
    contextLocalStorage: new AsyncLocalStorage(),
    sinks: {
      console: redactByField(consoleSink, {
        fieldPatterns: ['authorization', 'databaseUrl', 'password', 'secret', 'token', /api[-_]?key/i],
        action: () => '[REDACTED]',
      }),
    },
    loggers: [
      {
        category: ['logtape', 'meta'],
        lowestLevel: 'warning',
        sinks: ['console'],
      },
      {
        category: ['hermes'],
        lowestLevel: environment.logLevel,
        sinks: ['console'],
      },
    ],
  });
};
