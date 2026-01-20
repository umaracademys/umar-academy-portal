import { useState, useCallback } from 'react';

interface OptimisticState<T> {
  value: T;
  isOptimistic: boolean;
  error: string | null;
  isLoading: boolean;
}

/**
 * Hook for optimistic UI updates
 * Updates UI immediately, then syncs with backend
 */
export function useOptimisticUpdate<T>(
  initialValue: T,
  updateFn: (value: T) => Promise<T>
) {
  const [state, setState] = useState<OptimisticState<T>>({
    value: initialValue,
    isOptimistic: false,
    error: null,
    isLoading: false,
  });

  const update = useCallback(
    async (newValue: T) => {
      // 1. Update optimistically
      setState({
        value: newValue,
        isOptimistic: true,
        error: null,
        isLoading: true,
      });

      try {
        // 2. Call API
        const confirmedValue = await updateFn(newValue);
        
        // 3. Confirm with server value
        setState({
          value: confirmedValue,
          isOptimistic: false,
          error: null,
          isLoading: false,
        });
      } catch (error) {
        // 4. Rollback on error
        setState({
          value: initialValue,
          isOptimistic: false,
          error: error instanceof Error ? error.message : 'Update failed',
          isLoading: false,
        });
        throw error;
      }
    },
    [initialValue, updateFn]
  );

  const reset = useCallback(() => {
    setState({
      value: initialValue,
      isOptimistic: false,
      error: null,
      isLoading: false,
    });
  }, [initialValue]);

  return {
    value: state.value,
    isOptimistic: state.isOptimistic,
    error: state.error,
    isLoading: state.isLoading,
    update,
    reset,
  };
}
