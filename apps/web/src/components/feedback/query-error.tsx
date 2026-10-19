import { ApiError } from '../../lib/api/api-error';
import { ContentState, ErrorState } from './content-state';
import type { ReactNode } from 'react';

type QueryErrorProps = {
  /** The error of the failed request. */
  error: unknown;
  /**
   * Shown for an error the component does not know about. Return null to fall
   * back to the retry state.
   */
  fallback?: (error: unknown) => ReactNode;
  /** Shown when the record is not available anymore. */
  notFound: { action?: ReactNode; description: string; title: string };
  onRetry: () => void;
};

/**
 * Shows the state of a failed request. A record that is gone gets its own
 * message, every other failure can be retried.
 */
export const QueryError = ({ error, fallback, notFound, onRetry }: QueryErrorProps) => {
  if (error instanceof ApiError && error.status === 404) {
    return <ContentState action={notFound.action} description={notFound.description} title={notFound.title} />;
  }

  if (fallback !== undefined) {
    const custom = fallback(error);

    if (custom !== null) {
      return custom;
    }
  }

  return <ErrorState onRetry={onRetry} />;
};
