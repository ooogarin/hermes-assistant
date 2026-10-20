import { Button } from '../ui/button';
import { ContentState } from './content-state';
import type { ReactNode } from 'react';

type ListEmptyStateProps = {
  /** Action shown when the list holds no record at all. */
  action?: ReactNode;
  /** Shown when the reader filtered and nothing matched. */
  filteredDescription: string;
  /** Shown when the reader filtered and nothing matched. */
  filteredTitle: string;
  /** Shown when the list holds no record and the reader has not filtered. */
  description: string;
  /** Whether a filter is active. */
  hasFilters: boolean;
  /** Clears the filters. */
  onClearFilters: () => void;
  /** Shown when the list holds no record and the reader has not filtered. */
  title: string;
};

/**
 * The empty state of a list. A filtered list offers to clear the filters, an
 * empty list explains what will fill it.
 */
export const ListEmptyState = ({
  action,
  description,
  filteredDescription,
  filteredTitle,
  hasFilters,
  onClearFilters,
  title,
}: ListEmptyStateProps) => (
  <ContentState
    action={
      hasFilters ? (
        <Button variant='secondary' onClick={onClearFilters}>
          Hapus filter
        </Button>
      ) : (
        action
      )
    }
    description={hasFilters ? filteredDescription : description}
    title={hasFilters ? filteredTitle : title}
  />
);
