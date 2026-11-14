import { expect, test } from 'bun:test';
import { extractSourceUrl } from '../src/core/link/source-url';

const cases: Array<{ expected: string | null; rawText: string }> = [
  { expected: 'https://example.com/article', rawText: 'lihat https://example.com/article bagus' },
  { expected: 'https://example.com/article', rawText: 'baca (https://example.com/article).' },
  { expected: 'https://example.com/article', rawText: 'ini [artikel](https://example.com/article) menarik' },
  { expected: null, rawText: 'artikel tanpa tautan sama sekali' },
  { expected: null, rawText: 'bukan tautan ftp://example.com/file' },
];

test('extracts the first HTTP(S) URL and ignores surrounding punctuation', () => {
  for (const testCase of cases) {
    expect(extractSourceUrl(testCase.rawText)).toBe(testCase.expected);
  }
});
