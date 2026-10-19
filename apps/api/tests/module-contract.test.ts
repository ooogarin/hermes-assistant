import { expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  findCallSites,
  findExportedFunctions,
  findNamedImports,
  findNamespaceImports,
  readSourceFiles,
  relativePath,
} from './helpers/source-scanner';
import type { SourceFile } from './helpers/source-scanner';

const sourceDirectory = resolve(import.meta.dir, '..', 'src');
const repositoryRoot = resolve(sourceDirectory, '..');

type ZodDefinition = {
  type: string;
  catchall?: unknown;
  element?: unknown;
  in?: unknown;
  innerType?: unknown;
  out?: unknown;
  options?: unknown[];
  shape?: Record<string, unknown>;
  valueType?: unknown;
};

type ZodLike = {
  _zod?: { def?: ZodDefinition };
};

const readDefinition = (value: unknown): ZodDefinition | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return (value as ZodLike)._zod?.def;
};

const isZodSchema = (value: unknown): boolean => readDefinition(value) !== undefined;

const isStrictObject = (value: unknown): boolean => {
  const catchall = readDefinition(value)?.catchall;

  return readDefinition(catchall)?.type === 'never';
};

const collectObjectSchemas = (value: unknown, found: unknown[] = []): unknown[] => {
  const definition = readDefinition(value);

  if (definition === undefined) {
    return found;
  }

  if (definition.type === 'object') {
    found.push(value);

    for (const property of Object.values(definition.shape ?? {})) {
      collectObjectSchemas(property, found);
    }

    return found;
  }

  if (definition.type === 'array') {
    return collectObjectSchemas(definition.element, found);
  }

  if (definition.type === 'union' || definition.type === 'discriminated_union') {
    for (const option of definition.options ?? []) {
      collectObjectSchemas(option, found);
    }

    return found;
  }

  if (definition.type === 'pipe') {
    collectObjectSchemas(definition.in, found);
    return collectObjectSchemas(definition.out, found);
  }

  if (definition.type === 'record') {
    return collectObjectSchemas(definition.valueType, found);
  }

  if (definition.innerType !== undefined) {
    return collectObjectSchemas(definition.innerType, found);
  }

  return found;
};

const buildAliasMap = (files: SourceFile[]): Map<string, Set<string>> => {
  const aliasesByPath = new Map<string, Set<string>>();

  for (const file of files) {
    for (const imported of findNamespaceImports(file)) {
      const aliases = aliasesByPath.get(imported.resolvedPath) ?? new Set<string>();
      aliases.add(imported.alias);
      aliasesByPath.set(imported.resolvedPath, aliases);
    }
  }

  return aliasesByPath;
};

test('repository transaction parameters match how callers actually use them', async () => {
  const files = await readSourceFiles(sourceDirectory);
  const aliasesByPath = buildAliasMap(files);
  const violations: string[] = [];

  for (const file of files.filter((entry) => entry.path.endsWith('.repository.ts'))) {
    for (const repositoryFunction of findExportedFunctions(file)) {
      if (!repositoryFunction.hasOptionalTransaction) {
        continue;
      }

      const callSites = findCallSites(files, repositoryFunction, aliasesByPath);
      const location = relativePath(repositoryRoot, repositoryFunction.filePath);
      const withTransaction = callSites.filter((callSite) => callSite.passesTransaction).length;
      const withoutTransaction = callSites.length - withTransaction;

      if (callSites.length === 0) {
        violations.push(`${location} ${repositoryFunction.name} is never called.`);
        continue;
      }

      if (withTransaction === 0) {
        violations.push(
          `${location} ${repositoryFunction.name} declares an optional trx but every caller uses the pool connection. Remove the parameter.`,
        );
        continue;
      }

      if (withoutTransaction === 0) {
        violations.push(
          `${location} ${repositoryFunction.name} declares an optional trx but every caller passes a transaction. Make the parameter required.`,
        );
      }
    }
  }

  expect(violations).toEqual([]);
});

test('only repositories and the database core reach PostgreSQL', async () => {
  const files = await readSourceFiles(sourceDirectory);
  const violations = files
    .filter((file) => !file.path.endsWith('.repository.ts'))
    .filter((file) => !file.path.includes('/core/database/'))
    .filter((file) => /getDatabaseClient|bun:sql/.test(file.text))
    .map((file) => relativePath(repositoryRoot, file.path));

  expect(violations).toEqual([]);
});

test('handlers and services contain no SQL', async () => {
  const files = await readSourceFiles(sourceDirectory);
  const sqlPattern = /\bSELECT\s+[A-Za-z_]+|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\s+[A-Za-z_]+\s+SET\b/;
  const violations = files
    .filter((file) => file.path.endsWith('.handler.ts') || file.path.endsWith('.service.ts'))
    .filter((file) => sqlPattern.test(file.text))
    .map((file) => relativePath(repositoryRoot, file.path));

  expect(violations).toEqual([]);
});

test('request schemas reject unknown fields', async () => {
  const files = await readSourceFiles(sourceDirectory);
  const routeFiles = files.filter((file) => file.path.endsWith('.route.ts'));
  const validatorFiles = files.filter((file) => file.path.includes('/modules/') && file.path.endsWith('.validator.ts'));

  const pathParameterSchemas = new Set<string>();

  for (const routeFile of routeFiles) {
    const namedImports = findNamedImports(routeFile);

    for (const match of routeFile.text.matchAll(/appValidator\(\s*'param'\s*,\s*(\w+)/g)) {
      const imported = namedImports.find((entry) => entry.name === match[1]);

      if (imported !== undefined) {
        pathParameterSchemas.add(`${imported.resolvedPath}::${match[1]}`);
      }
    }
  }

  const violations: string[] = [];

  for (const validatorFile of validatorFiles) {
    const moduleExports = (await import(pathToFileURL(validatorFile.path).href)) as Record<string, unknown>;

    for (const [name, exported] of Object.entries(moduleExports)) {
      if (!isZodSchema(exported)) {
        continue;
      }

      if (pathParameterSchemas.has(`${validatorFile.path}::${name}`)) {
        continue;
      }

      for (const objectSchema of collectObjectSchemas(exported)) {
        if (!isStrictObject(objectSchema)) {
          violations.push(
            `${relativePath(repositoryRoot, validatorFile.path)} ${name} accepts unknown fields. End the schema with .strict().`,
          );
        }
      }
    }
  }

  expect(violations).toEqual([]);
});
