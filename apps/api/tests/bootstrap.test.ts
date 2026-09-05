import { expect, test } from 'bun:test';

test('runs on Bun', () => {
  expect(Bun.version).toMatch(/^\d+\.\d+\.\d+/);
});
