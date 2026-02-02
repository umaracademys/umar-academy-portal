/**
 * Shared loading state — use for consistent loading/error/empty handling across dashboards and lists.
 */
import { useState, useCallback } from 'react';

export interface LoadingState {
  loading: boolean;
  error: string | null;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  clearError: () => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

export function useLoadingState(initialLoading = false): LoadingState {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      setError(null);
      setLoading(true);
      try {
        const result = await fn();
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Something went wrong';
        setError(message);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, setLoading, setError, clearError, run };
}
