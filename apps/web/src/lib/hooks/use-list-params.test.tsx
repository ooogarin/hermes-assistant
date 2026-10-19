import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { useListParams } from './use-list-params';
import type { ReactNode } from 'react';

const statuses = ['read', 'unread'] as const;

const useListParamsProbe = () => {
  const params = useListParams({
    deferred: ['genre', 'levels'],
    fields: {
      genre: { param: 'genre' },
      levels: { param: 'levels' },
      reading_status: { param: 'reading_status', values: statuses },
      source_url: { alias: 'sourceUrl', param: 'source_url' },
    },
    quick: 'reading_status',
  });
  const location = useLocation();

  return { params, search: location.search };
};

const renderListParams = (initialEntry: string) =>
  renderHook(() => useListParamsProbe(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    ),
  });

describe('useListParams', () => {
  test('reads the applied filters from the browser URL', () => {
    const { result } = renderListParams('/materials?q=jam&reading_status=unread&sort=oldest');

    expect(result.current.params.filters.q).toBe('jam');
    expect(result.current.params.filters.reading_status).toBe('unread');
    expect(result.current.params.sort).toBe('oldest');
  });

  test('ignores a value outside the known list', () => {
    const { result } = renderListParams('/materials?reading_status=archived');

    expect(result.current.params.filters.reading_status).toBeUndefined();
  });

  test('keeps unrelated params when a filter changes', () => {
    const { result } = renderListParams('/materials?preview=1&reading_status=read');

    act(() => {
      result.current.params.setQuick('unread');
    });

    expect(result.current.params.filters.reading_status).toBe('unread');
    expect(new URLSearchParams(result.current.search).get('preview')).toBe('1');
  });

  test('removes a filter when the value is empty', () => {
    const { result } = renderListParams('/materials?q=jam&sort=oldest');

    act(() => {
      result.current.params.setParam('q', undefined);
    });

    expect(result.current.params.filters.q).toBeUndefined();
    expect(result.current.params.sort).toBe('oldest');
  });

  test('reads an older name of a parameter and replaces it when the filter changes', () => {
    const { result } = renderListParams('/materials?sourceUrl=https%3A%2F%2Fexample.com');

    expect(result.current.params.filters.source_url).toBe('https://example.com');
  });

  test('waits for the reader to apply a draft', () => {
    const { result } = renderListParams('/materials');

    act(() => {
      result.current.params.setDraft('genre', 'fantasy');
    });

    expect(new URLSearchParams(result.current.search).get('genre')).toBeNull();

    act(() => {
      result.current.params.applyFilters();
    });

    expect(new URLSearchParams(result.current.search).get('genre')).toBe('fantasy');
  });

  test('keeps a draft that was not applied when another filter changes', () => {
    const { result } = renderListParams('/materials');

    act(() => {
      result.current.params.setDraft('genre', 'fantasy');
    });

    act(() => {
      result.current.params.setParam('q', 'jam');
    });

    expect(result.current.params.drafts.genre).toBe('fantasy');
  });

  test('clears every filter', () => {
    const { result } = renderListParams('/materials?q=jam&sort=oldest');

    act(() => {
      result.current.params.clearFilters();
    });

    expect(result.current.search).toBe('');
  });
});
