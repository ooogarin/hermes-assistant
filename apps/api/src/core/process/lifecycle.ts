import type { ProcessLifecycle, ProcessLifecycleOptions, ShutdownSignal } from './process.types';

const defaultExit = (code: number): void => {
  process.exit(code);
};

/**
 * Owns the process shutdown sequence.
 *
 * The exit call is explicit on purpose. Registering a signal handler replaces the
 * default disposition, and Bun's watch loop stays alive after the handler returns,
 * so a shutdown that only sets `process.exitCode` leaves the watcher running and
 * holding its file descriptors. Ending the process here stops the watcher too.
 */
export const createProcessLifecycle = (options: ProcessLifecycleOptions): ProcessLifecycle => {
  const { server, database, logger, shutdownTimeoutMs } = options;
  const exit = options.exit ?? defaultExit;

  let isShuttingDown = false;
  let isForcingShutdown = false;
  let hasExited = false;

  const exitOnce = (code: number): void => {
    if (hasExited) {
      return;
    }

    hasExited = true;
    exit(code);
  };

  const forceShutdown = async (): Promise<void> => {
    if (isForcingShutdown) {
      return;
    }

    isForcingShutdown = true;
    logger.warning('Forcing application shutdown');

    await server.stop(true).catch(() => {
      logger.error('HTTP server force-stop failed');
    });
    await database.close({ timeout: 0 }).catch(() => {
      logger.error('Database connection force-close failed');
    });
  };

  const shutdown = async (signal: ShutdownSignal): Promise<void> => {
    if (isShuttingDown) {
      await forceShutdown();
      exitOnce(1);

      return;
    }

    isShuttingDown = true;
    logger.info('Shutting down application [signal={signal}]', { signal });

    const timeout = setTimeout(() => {
      void forceShutdown().then(() => exitOnce(1));
    }, shutdownTimeoutMs);

    try {
      await server.stop();
      await database.close({ timeout: shutdownTimeoutMs / 1_000 });

      if (!isForcingShutdown) {
        logger.info('Application shut down cleanly');
      }
    } catch {
      logger.error('Application shutdown failed');
      await forceShutdown();
    } finally {
      clearTimeout(timeout);
    }

    exitOnce(isForcingShutdown ? 1 : 0);
  };

  return { shutdown };
};
