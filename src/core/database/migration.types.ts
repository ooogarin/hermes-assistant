import type { DatabaseTransaction } from './database.types';

export type MigrationDefinition = {
  up: (transaction: DatabaseTransaction) => Promise<void> | void;
  down: (transaction: DatabaseTransaction) => Promise<void> | void;
};

export type Migration = MigrationDefinition & {
  name: string;
};

export type MigrationStatus = {
  name: string;
  status: 'applied' | 'pending' | 'missing';
};
