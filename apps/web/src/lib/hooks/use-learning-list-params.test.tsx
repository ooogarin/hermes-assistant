import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { useLearningListParams } from './use-learning-list-params';
import type { ReactNode } from 'react';

const statuses = ['read', 'unread'] as const;

const useListParamsProbe = () => {
  const params = useLearningListParams({ statusParam: 'reading_status', statuses });
  const location = useLocation();

  return { params, search: location.search };
};

const renderListParams = (initialEntry: string) =>
  renderHook(() => useListParamsProbe(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    ),
  });

describe('useLearningListParams', () => {
  test('reads the applied filters from the browser URL', () => {
    const { result } = renderListParams('/materials?q=jam&reading_status=unread&sort=oldest');

    expect(result.current.params.query).toBe('jam');
    expect(result.current.params.status).toBe('unread');
    expect(result.current.params.sort).toBe('oldest');
  });

  test('ignores a status value outside the known list', () => {
    const { result } = renderListParams('/materials?reading_status=archived');

    expect(result.current.params.status).toBeUndefined();
  });

  test('keeps unrelated params when a filter changes', () => {
    const { result } = renderListParams('/materials?preview=1&reading_status=read');

    act(() => {
      result.current.params.setStatus('unread');
    });

    expect(result.current.params.status).toBe('unread');
    expect(new URLSearchParams(result.current.search).get('preview')).toBe('1');
  });

  test('removes a filter when the value is empty', () => {
    const { result } = renderListParams('/materials?q=jam&sort=oldest');

    act(() => {
      result.current.params.setParams({ q: undefined });
    });

    expect(result.current.params.query).toBeUndefined();
    expect(result.current.params.sort).toBe('oldest');
  });

  test('joins array values with a comma', () => {
    const { result } = renderListParams('/materials');

    act(() => {
      result.current.params.setParams({ levels: ['A1', 'B2'] });
    });

    expect(new URLSearchParams(result.current.search).get('levels')).toBe('A1,B2');
  });

  test('clears every filter', () => {
    const { result } = renderListParams('/materials?q=jam&sort=oldest');

    act(() => {
      result.current.params.clearParams();
    });

    expect(result.current.search).toBe('');
  });
});
