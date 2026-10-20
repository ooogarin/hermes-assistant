import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

export type SourceFile = {
  path: string;
  text: string;
};

export type RepositoryFunction = {
  filePath: string;
  name: string;
  parameterCount: number;
  hasOptionalTransaction: boolean;
  hasRequiredTransaction: boolean;
};

export type CallSite = {
  filePath: string;
  argumentCount: number;
  passesTransaction: boolean;
};

export type ExportedFunctionBody = {
  filePath: string;
  name: string;
  body: string;
};

const skipString = (text: string, index: number, quote: string): number => {
  let cursor = index + 1;

  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2;
      continue;
    }

    if (text[cursor] === quote) {
      return cursor + 1;
    }

    cursor += 1;
  }

  return text.length;
};

const skipTemplate = (text: string, index: number): number => {
  let cursor = index + 1;

  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2;
      continue;
    }

    if (text[cursor] === '`') {
      return cursor + 1;
    }

    if (text[cursor] === '$' && text[cursor + 1] === '{') {
      cursor = readBalancedGroup(text, cursor + 1).endIndex;
      continue;
    }

    cursor += 1;
  }

  return text.length;
};

/**
 * Reads a balanced group that starts at `openIndex` and returns its inner text
 * together with the index just after the closing delimiter. String, template, and
 * comment contents are ignored while matching so that parentheses inside them do
 * not affect the balance.
 */
export const readBalancedGroup = (text: string, openIndex: number): { body: string; endIndex: number } => {
  let depth = 0;
  let index = openIndex;

  while (index < text.length) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '/' && next === '/') {
      const lineEnd = text.indexOf('\n', index);
      index = lineEnd === -1 ? text.length : lineEnd;
      continue;
    }

    if (character === '/' && next === '*') {
      const commentEnd = text.indexOf('*/', index + 2);
      index = commentEnd === -1 ? text.length : commentEnd + 2;
      continue;
    }

    if (character === "'" || character === '"') {
      index = skipString(text, index, character);
      continue;
    }

    if (character === '`') {
      index = skipTemplate(text, index);
      continue;
    }

    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;

      if (depth === 0) {
        return { body: text.slice(openIndex + 1, index), endIndex: index + 1 };
      }
    }

    index += 1;
  }

  return { body: text.slice(openIndex + 1), endIndex: text.length };
};

/**
 * Reads a block that starts at `openIndex`, the opening brace, and returns its
 * inner text together with the index just after the closing brace. String,
 * template, and comment contents are ignored while matching.
 */
export const readBlock = (text: string, openIndex: number): { body: string; endIndex: number } => {
  let depth = 0;
  let index = openIndex;

  while (index < text.length) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '/' && next === '/') {
      const lineEnd = text.indexOf('\n', index);
      index = lineEnd === -1 ? text.length : lineEnd;
      continue;
    }

    if (character === '/' && next === '*') {
      const commentEnd = text.indexOf('*/', index + 2);
      index = commentEnd === -1 ? text.length : commentEnd + 2;
      continue;
    }

    if (character === "'" || character === '"') {
      index = skipString(text, index, character);
      continue;
    }

    if (character === '`') {
      index = skipTemplate(text, index);
      continue;
    }

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return { body: text.slice(openIndex + 1, index), endIndex: index + 1 };
      }
    }

    index += 1;
  }

  return { body: text.slice(openIndex + 1), endIndex: text.length };
};

/**
 * Splits a group body on its top-level commas. Nested groups, strings, templates,
 * and comments never split an argument.
 */
export const splitTopLevel = (body: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let index = 0;

  while (index < body.length) {
    const character = body[index];
    const next = body[index + 1];

    if (character === '/' && next === '/') {
      const lineEnd = body.indexOf('\n', index);
      index = lineEnd === -1 ? body.length : lineEnd;
      continue;
    }

    if (character === '/' && next === '*') {
      const commentEnd = body.indexOf('*/', index + 2);
      index = commentEnd === -1 ? body.length : commentEnd + 2;
      continue;
    }

    if (character === "'" || character === '"') {
      index = skipString(body, index, character);
      continue;
    }

    if (character === '`') {
      index = skipTemplate(body, index);
      continue;
    }

    if (character === '(' || character === '[' || character === '{') {
      depth += 1;
    } else if (character === ')' || character === ']' || character === '}') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      parts.push(body.slice(start, index));
      start = index + 1;
    }

    index += 1;
  }

  parts.push(body.slice(start));

  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
};

const matchGroup = (match: RegExpExecArray, index: number): string => match[index] ?? '';

const declarationPattern = /export const (\w+) = (?:async )?\(/g;

/**
 * Collects the exported arrow functions of a source file together with the
 * signature of their parameter list.
 */
export const findExportedFunctions = (file: SourceFile): RepositoryFunction[] => {
  const functions: RepositoryFunction[] = [];
  const pattern = new RegExp(declarationPattern.source, 'g');
  let match = pattern.exec(file.text);

  while (match !== null) {
    const name = matchGroup(match, 1);
    const openIndex = match.index + match[0].length - 1;
    const parameters = splitTopLevel(readBalancedGroup(file.text, openIndex).body);
    const lastParameter = parameters[parameters.length - 1] ?? '';

    functions.push({
      filePath: file.path,
      name,
      parameterCount: parameters.length,
      hasOptionalTransaction: /^trx\?:/.test(lastParameter),
      hasRequiredTransaction: /^trx:/.test(lastParameter),
    });

    match = pattern.exec(file.text);
  }

  return functions;
};

const namespaceImportPattern = /import \* as (\w+) from ['"]([^'"]+)['"]/g;
export type NamespaceImport = {
  alias: string;
  resolvedPath: string;
};

/**
 * Collects the `import * as alias from '...'` statements of a file and resolves
 * each specifier to an absolute path.
 */
export const findNamespaceImports = (file: SourceFile): NamespaceImport[] => {
  const imports: NamespaceImport[] = [];
  const pattern = new RegExp(namespaceImportPattern.source, 'g');
  let match = pattern.exec(file.text);

  while (match !== null) {
    imports.push({
      alias: matchGroup(match, 1),
      resolvedPath: resolveModulePath(file.path, matchGroup(match, 2)),
    });

    match = pattern.exec(file.text);
  }

  return imports;
};

export const resolveModulePath = (fromPath: string, specifier: string): string => {
  const base = resolve(join(fromPath, '..', specifier));

  return base.endsWith('.ts') ? base : `${base}.ts`;
};

export type NamedImport = {
  name: string;
  resolvedPath: string;
};

const namedImportPattern = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;

/**
 * Collects the named imports of a file and resolves each specifier to an
 * absolute module path.
 */
export const findNamedImports = (file: SourceFile): NamedImport[] => {
  const imports: NamedImport[] = [];
  const pattern = new RegExp(namedImportPattern.source, 'g');
  let match = pattern.exec(file.text);

  while (match !== null) {
    const names = matchGroup(match, 1)
      .split(',')
      .map((entry) => {
        const [original] = entry.trim().split(/\s+as\s+/);

        return (original ?? '').trim();
      })
      .filter((entry) => entry.length > 0);
    const resolvedPath = resolveModulePath(file.path, matchGroup(match, 2));

    for (const name of names) {
      imports.push({ name, resolvedPath });
    }

    match = pattern.exec(file.text);
  }

  return imports;
};

export const relativePath = (fromPath: string, toPath: string): string => relative(fromPath, toPath);

/**
 * Collects the exported arrow functions of a source file together with the body
 * of each function, so a caller can inspect what one function calls.
 */
export const findExportedFunctionBodies = (file: SourceFile): ExportedFunctionBody[] => {
  const functions: ExportedFunctionBody[] = [];
  const pattern = new RegExp(declarationPattern.source, 'g');
  let match = pattern.exec(file.text);

  while (match !== null) {
    const name = matchGroup(match, 1);
    const openIndex = match.index + match[0].length - 1;
    const parameters = readBalancedGroup(file.text, openIndex);
    const arrowIndex = file.text.indexOf('=>', parameters.endIndex);
    let bodyStart = arrowIndex + 2;

    while (bodyStart < file.text.length && /\s/.test(file.text[bodyStart] ?? '')) {
      bodyStart += 1;
    }

    if (arrowIndex !== -1 && file.text[bodyStart] === '{') {
      const body = readBlock(file.text, bodyStart);

      functions.push({ body: body.body, filePath: file.path, name });
    }

    match = pattern.exec(file.text);
  }

  return functions;
};
/**
 * Finds the call sites of a repository function. A call counts only when the
 * receiver is the namespace alias that the caller uses for the defining file.
 */
export const findCallSites = (
  files: SourceFile[],
  target: RepositoryFunction,
  aliasesByPath: Map<string, Set<string>>,
): CallSite[] => {
  const aliases = aliasesByPath.get(target.filePath);

  if (aliases === undefined || aliases.size === 0) {
    return [];
  }

  const callSites: CallSite[] = [];

  for (const file of files) {
    for (const alias of aliases) {
      const pattern = new RegExp(`\\b${alias}\\.${target.name}\\s*\\(`, 'g');
      let match = pattern.exec(file.text);

      while (match !== null) {
        const openIndex = match.index + match[0].length - 1;
        const argumentsList = splitTopLevel(readBalancedGroup(file.text, openIndex).body);
        const transactionArgument = argumentsList[target.parameterCount - 1];
        const passesTransaction =
          argumentsList.length >= target.parameterCount &&
          transactionArgument !== undefined &&
          transactionArgument !== 'undefined';

        callSites.push({
          filePath: file.path,
          argumentCount: argumentsList.length,
          passesTransaction,
        });

        match = pattern.exec(file.text);
      }
    }
  }

  return callSites;
};

/**
 * Reads every TypeScript file below a directory and returns absolute paths.
 */
export const readSourceFiles = async (directory: string): Promise<SourceFile[]> => {
  const files: SourceFile[] = [];

  const collect = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(current, entry.name);

      if (entry.isDirectory()) {
        await collect(path);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push({ path, text: await Bun.file(path).text() });
      }
    }
  };

  await collect(resolve(directory));

  return files;
};
