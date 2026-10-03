import { describe, expect, test } from 'vitest';
import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  test('keeps a known internal destination and query', () => {
    expect(safeReturnTo('/notes/NT-123?preview=NT-456')).toBe('/notes/NT-123?preview=NT-456');
  });

  test.each([
    '/english/writing/new',
    '/english/writing/materials?status=submitted',
    '/english/writing/materials/WR-20261003-001',
    '/english/writing/submissions/WS-20261003-001',
    '/english/writing/submissions/WS-20261003-001/edit',
    '/english/writing/submissions/WS-20261003-001/feedback',
    '/english/writing/submissions/WS-20261003-001/corrected-text',
  ])('returns to the new Writing destination after login: %s', (destination) => {
    expect(safeReturnTo(destination)).toBe(destination);
  });

  test.each(['https://example.com/finance', '//example.com/finance', '/unknown', '/login', '/finance/unknown'])(
    'rejects an external or unknown destination: %s',
    (destination) => {
      expect(safeReturnTo(destination)).toBe('/finance');
    },
  );
});
