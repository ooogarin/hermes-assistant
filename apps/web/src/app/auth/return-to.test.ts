import { describe, expect, test } from 'vitest';
import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  test('keeps a known internal destination and query', () => {
    expect(safeReturnTo('/notes/NT-123?preview=NT-456')).toBe('/notes/NT-123?preview=NT-456');
  });

  test.each(['https://example.com/finance', '//example.com/finance', '/unknown', '/login', '/finance/unknown'])(
    'rejects an external or unknown destination: %s',
    (destination) => {
      expect(safeReturnTo(destination)).toBe('/finance');
    },
  );
});
