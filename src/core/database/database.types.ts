import type { SQL } from 'bun';

export type DatabaseClient = InstanceType<typeof SQL>;
export type DatabaseConnection = DatabaseClient | Bun.ReservedSQL;
export type DatabaseTransaction = Bun.TransactionSQL;
