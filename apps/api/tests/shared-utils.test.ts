import { expect, test } from 'bun:test';
import { formatPublicCode } from '../src/shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../src/shared/date/date';
import { countWords } from '../src/shared/text/word-count';

test('builds a code date from the Asia/Jakarta calendar day', () => {
  expect(getJakartaDateCodeParts(new Date('2026-09-04T17:30:00.000Z'))).toEqual({
    key: 20260905,
    segment: '20260905',
  });
});

test('formats public codes with a three-digit sequence', () => {
  expect(formatPublicCode('NT', '20260905', 7)).toBe('NT-20260905-007');
});

test('normalizes database timestamps to ISO 8601', () => {
  expect(toIsoTimestamp('2026-09-05T17:30:00+07:00')).toBe('2026-09-05T10:30:00.000Z');
});

test('counts words across repeated whitespace', () => {
  expect(countWords('  One\n two\tthree  ')).toBe(3);
  expect(countWords('   ')).toBe(0);
});
