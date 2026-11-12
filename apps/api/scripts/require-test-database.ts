const main = (): void => {
  const testDatabaseUrl = Bun.env.TEST_DATABASE_URL?.trim();

  if (testDatabaseUrl === undefined || testDatabaseUrl.length === 0) {
    throw new Error('TEST_DATABASE_URL is required for database integration tests.');
  }

  let url: URL;

  try {
    url = new URL(testDatabaseUrl);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  const usesPostgresProtocol = url.protocol === 'postgres:' || url.protocol === 'postgresql:';

  if (!usesPostgresProtocol) {
    throw new Error('TEST_DATABASE_URL must use the postgres: or postgresql: protocol.');
  }

  const databaseName = url.pathname.slice(1);

  if (!databaseName.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must target a database whose name ends in _test.');
  }

  console.log('Integration database configuration is valid.');
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Integration database configuration is invalid.');
  process.exit(1);
}
