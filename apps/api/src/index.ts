import { createApp } from './app';
import { loadEnvironment } from './core/config/env';
import { configureDatabaseClient, createDatabaseClient } from './core/database/client';
import { isDatabaseReady } from './core/database/health.repository';
import { appLogger, configureLogging } from './core/logging/logger';

const environment = loadEnvironment(Bun.env);
await configureLogging(environment);

const database = createDatabaseClient(environment.databaseUrl);
configureDatabaseClient(database);
const app = createApp({
  internalApiKey: environment.internalApiKey,
  isDatabaseReady: () => isDatabaseReady(database),
  readinessTimeoutMs: environment.readinessTimeoutMs,
  webAuth: environment.webAuth,
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
let isForcingShutdown = false;
const shutdownTimeoutMs = 10_000;

const forceShutdown = async (): Promise<void> => {
  if (isForcingShutdown) {
    return;
  }

  isForcingShutdown = true;
  process.exitCode = 1;
  appLogger.warning('Forcing application shutdown');
  await server.stop(true).catch(() => {
    appLogger.error('HTTP server force-stop failed');
  });
  await database.close({ timeout: 0 }).catch(() => {
    appLogger.error('Database connection force-close failed');
  });
};

const shutdown = async (signal: 'SIGINT' | 'SIGTERM') => {
  if (isShuttingDown) {
    await forceShutdown();
    return;
  }

  isShuttingDown = true;
  appLogger.info('Shutting down application [signal={signal}]', { signal });
  const timeout = setTimeout(() => void forceShutdown(), shutdownTimeoutMs);

  try {
    await server.stop();
    await database.close({ timeout: shutdownTimeoutMs / 1_000 });

    if (!isForcingShutdown) {
      appLogger.info('Application shut down cleanly');
    }
  } catch {
    process.exitCode = 1;
    appLogger.error('Application shutdown failed');
    await forceShutdown();
  } finally {
    clearTimeout(timeout);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
