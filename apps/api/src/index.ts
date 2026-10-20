import { createApp } from './app';
import { loadEnvironment } from './core/config/env';
import { configureDatabaseClient, createDatabaseClient } from './core/database/client';
import { isDatabaseReady } from './core/database/health.repository';
import { appLogger, configureLogging } from './core/logging/logger';
import { createProcessLifecycle } from './core/process/lifecycle';

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

const shutdownTimeoutMs = 10_000;

const lifecycle = createProcessLifecycle({
  server,
  database,
  logger: appLogger,
  shutdownTimeoutMs,
});

process.on('SIGINT', () => void lifecycle.shutdown('SIGINT'));
process.on('SIGTERM', () => void lifecycle.shutdown('SIGTERM'));
