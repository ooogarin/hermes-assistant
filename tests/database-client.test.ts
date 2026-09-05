import { expect, test } from 'bun:test';
import { commitTransaction, rollbackTransaction } from '../src/core/database/client';
import type { DatabaseReservedConnection } from '../src/core/database/database.types';

type FakeTransaction = {
  commands: string[];
  releaseCount: () => number;
  trx: DatabaseReservedConnection;
};

const createFakeTransaction = (failureByCommand: ReadonlyMap<string, Error> = new Map()): FakeTransaction => {
  const commands: string[] = [];
  let releases = 0;
  const execute = (strings: TemplateStringsArray): Promise<unknown[]> => {
    const command = strings.join('').trim();
    commands.push(command);

    const failure = failureByCommand.get(command);

    return failure === undefined ? Promise.resolve([]) : Promise.reject(failure);
  };
  const trx = Object.assign(execute, {
    release: () => {
      releases += 1;
    },
  }) as unknown as DatabaseReservedConnection;

  return { commands, releaseCount: () => releases, trx };
};

test('commits and releases a reserved database transaction', async () => {
  const fake = createFakeTransaction();

  await commitTransaction(fake.trx);

  expect(fake.commands).toEqual(['COMMIT']);
  expect(fake.releaseCount()).toBe(1);
});

test('rolls back after a failed commit without replacing the commit error', async () => {
  const commitError = new Error('commit failed');
  const fake = createFakeTransaction(new Map([['COMMIT', commitError]]));

  await expect(commitTransaction(fake.trx)).rejects.toBe(commitError);

  expect(fake.commands).toEqual(['COMMIT', 'ROLLBACK']);
  expect(fake.releaseCount()).toBe(1);
});

test('releases a reserved connection when rollback fails', async () => {
  const rollbackError = new Error('rollback failed');
  const fake = createFakeTransaction(new Map([['ROLLBACK', rollbackError]]));

  await expect(rollbackTransaction(fake.trx)).rejects.toBe(rollbackError);

  expect(fake.commands).toEqual(['ROLLBACK']);
  expect(fake.releaseCount()).toBe(1);
});
