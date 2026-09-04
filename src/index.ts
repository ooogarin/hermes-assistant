import { createApp } from './app';
import { loadEnvironment } from './core/config/env';
import { createDatabaseClient } from './core/database/client';
import { isDatabaseReady } from './core/database/health.repository';
import { appLogger, configureLogging } from './core/logging/logger';

const environment = loadEnvironment(Bun.env);
await configureLogging(environment);

const database = createDatabaseClient(environment.databaseUrl);
const app = createApp({
  internalApiKey: environment.internalApiKey,
  isDatabaseReady: () => isDatabaseReady(database),
});

const server = Bun.serve({
  fetch: app.fetch,
  hostname: environment.host,
  port: environment.port,
});

appLogger.info('App started on {host}:{port}', {
  host: environment.host,
  port: environment.port,
});

let isShuttingDown = false;

const shutdown = async (signal: 'SIGINT' | 'SIGTERM') => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  appLogger.info('Shutting down application [signal={signal}]', { signal });

  try {
    await server.stop();
    await database.close();
    appLogger.info('Application shut down cleanly');
  } catch {
    process.exitCode = 1;
    appLogger.error('Application shutdown failed');
  }
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
