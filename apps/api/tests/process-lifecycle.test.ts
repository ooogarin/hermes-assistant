import { expect, test } from 'bun:test';
import { createProcessLifecycle } from '../src/core/process/lifecycle';
import type { LifecycleDatabase, LifecycleLogger, LifecycleServer } from '../src/core/process/process.types';

type HarnessBehaviour = {
  stop?: (closeActiveConnections?: boolean) => Promise<void>;
  close?: (options?: { timeout?: number }) => Promise<void>;
};

const createHarness = (behaviour: HarnessBehaviour = {}) => {
  const exitCodes: number[] = [];
  const serverStops: Array<boolean | undefined> = [];
  const databaseCloses: Array<{ timeout?: number } | undefined> = [];
  const messages: string[] = [];

  const server: LifecycleServer = {
    stop: async (closeActiveConnections?: boolean) => {
      serverStops.push(closeActiveConnections);
      await behaviour.stop?.(closeActiveConnections);
    },
  };

  const database: LifecycleDatabase = {
    close: async (options?: { timeout?: number }) => {
      databaseCloses.push(options);
      await behaviour.close?.(options);
    },
  };

  const logger: LifecycleLogger = {
    info: (message: string) => {
      messages.push(message);
    },
    warning: (message: string) => {
      messages.push(message);
    },
    error: (message: string) => {
      messages.push(message);
    },
  };

  const lifecycle = createProcessLifecycle({
    server,
    database,
    logger,
    shutdownTimeoutMs: 50,
    exit: (code: number) => {
      exitCodes.push(code);
    },
  });

  return { lifecycle, exitCodes, serverStops, databaseCloses, messages };
};

const neverResolves = async (): Promise<void> => {
  await new Promise<void>(() => {});
};

test('a clean shutdown stops the server, closes the database, and ends the process', async () => {
  const harness = createHarness();

  await harness.lifecycle.shutdown('SIGINT');

  expect(harness.serverStops).toEqual([undefined]);
  expect(harness.databaseCloses.length).toBe(1);
  expect(harness.exitCodes).toEqual([0]);
  expect(harness.messages).toContain('Application shut down cleanly');
});

test('a failed shutdown force-stops the server and ends the process with a failure code', async () => {
  const harness = createHarness({
    stop: async () => {
      throw new Error('server stop failed');
    },
  });

  await harness.lifecycle.shutdown('SIGTERM');

  expect(harness.serverStops).toEqual([undefined, true]);
  expect(harness.exitCodes).toEqual([1]);
  expect(harness.messages).toContain('Application shutdown failed');
  expect(harness.messages).toContain('Forcing application shutdown');
});

test('a second signal during a hanging shutdown force-stops and ends the process', async () => {
  const harness = createHarness({
    stop: async (closeActiveConnections?: boolean) => {
      if (closeActiveConnections) {
        return;
      }

      await neverResolves();
    },
  });

  const first = harness.lifecycle.shutdown('SIGINT');
  const second = harness.lifecycle.shutdown('SIGINT');

  await second;

  expect(harness.serverStops).toEqual([undefined, true]);
  expect(harness.exitCodes).toEqual([1]);

  void first;
});

test('a shutdown that outlives the timeout force-stops and ends the process', async () => {
  const harness = createHarness({
    stop: async (closeActiveConnections?: boolean) => {
      if (closeActiveConnections) {
        return;
      }

      await neverResolves();
    },
  });

  void harness.lifecycle.shutdown('SIGINT');

  await Bun.sleep(150);

  expect(harness.serverStops).toEqual([undefined, true]);
  expect(harness.exitCodes).toEqual([1]);
});
