import { describe, expect, test } from 'vitest';
import { formatCurrency, formatDate, formatMonth, formatPercentage } from './formatters';

describe('frontend formatters', () => {
  test('formats Rupiah without fractional digits', () => {
    expect(formatCurrency(12_450_000)).toContain('12.450.000');
  });

  test('formats date-only values without shifting the calendar date', () => {
    expect(formatDate('2026-09-06')).toContain('6 Sep 2026');
  });

  test('formats a localized month label', () => {
    expect(formatMonth('2026-09-06')).toBe('September 2026');
  });

  test('formats a ratio as a percentage', () => {
    expect(formatPercentage(0.258)).toBe('25,8%');
  });
});
