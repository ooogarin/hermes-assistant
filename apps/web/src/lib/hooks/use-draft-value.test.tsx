import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useDraftValue } from './use-draft-value';

describe('useDraftValue', () => {
  test('holds a local value until the applied value changes', () => {
    const { result, rerender } = renderHook(({ applied }) => useDraftValue(applied), {
      initialProps: { applied: 'A1' as string | undefined },
    });

    act(() => {
      result.current[1]('B2');
    });

    expect(result.current[0]).toBe('B2');

    rerender({ applied: 'C1' });

    expect(result.current[0]).toBe('C1');
  });
});
