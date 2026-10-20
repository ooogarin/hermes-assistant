import type { SQL } from 'bun';

export type DatabaseClient = InstanceType<typeof SQL>;
export type DatabaseReservedConnection = Bun.ReservedSQL;
export type DatabaseConnection = DatabaseClient | DatabaseReservedConnection;
export type DatabaseTransaction = Bun.TransactionSQL;
