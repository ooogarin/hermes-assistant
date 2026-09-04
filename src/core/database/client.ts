import { SQL } from 'bun';
import type { DatabaseClient } from './database.types';

export const createDatabaseClient = (databaseUrl: string): DatabaseClient => new SQL(databaseUrl);
