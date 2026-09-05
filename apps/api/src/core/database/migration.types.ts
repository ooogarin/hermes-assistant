import type { DatabaseTransaction } from './database.types';

export type MigrationDefinition = {
  up: (trx: DatabaseTransaction) => Promise<void> | void;
  down: (trx: DatabaseTransaction) => Promise<void> | void;
};

export type Migration = MigrationDefinition & {
  name: string;
};

export type MigrationStatus = {
  name: string;
  status: 'applied' | 'pending' | 'missing';
};
