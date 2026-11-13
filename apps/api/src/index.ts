import { createApp } from './app';
import { createAiClient } from './core/ai/ai-client';
import { loadEnvironment } from './core/config/env';
import { configureDatabaseClient, createDatabaseClient } from './core/database/client';
import { isDatabaseReady } from './core/database/health.repository';
import { appLogger, configureLogging } from './core/logging/logger';
import { createProcessLifecycle } from './core/process/lifecycle';

const environment = loadEnvironment(Bun.env);
await configureLogging(environment);

const database = createDatabaseClient(environment.databaseUrl);
configureDatabaseClient(database);
const aiClient = environment.ai === null ? null : createAiClient(environment.ai);

if (environment.ai !== null) {
  appLogger.info(
    'AI capture enabled: model={model} temperature={temperature} maxTokens={maxTokens} timeoutMs={timeoutMs} [baseUrl={baseUrl}]',
    {
      baseUrl: environment.ai.base_url,
      maxTokens: environment.ai.max_tokens,
      model: environment.ai.model,
      temperature: environment.ai.temperature,
      timeoutMs: environment.ai.timeout_ms,
    },
  );
}

const app = createApp({
  internalApiKey: environment.internalApiKey,
  isDatabaseReady: () => isDatabaseReady(database),
  readinessTimeoutMs: environment.readinessTimeoutMs,
  webAuth: environment.webAuth,
  aiClient,
});

const server = Bun.serve({
  fetch: app.fetch,
  hostname: environment.host,
  // The default 10-second idle timeout is shorter than a possible AI request.
  idleTimeout: 60,
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
