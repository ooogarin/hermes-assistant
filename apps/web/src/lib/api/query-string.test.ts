import { describe, expect, test } from 'vitest';
import { buildQueryString } from './query-string';

describe('buildQueryString', () => {
  test('omits empty values and serializes supported primitives', () => {
    expect(
      buildQueryString({
        category: 'food',
        limit: 20,
        q: '  ',
        tag: undefined,
        archived: false,
      }),
    ).toBe('?category=food&limit=20&archived=false');
  });

  test('returns an empty string when no query value is present', () => {
    expect(buildQueryString({ q: '', tag: null })).toBe('');
  });
});
