import { useCallback, useEffect, useState } from 'react';

interface State<T> {
  key: string;
  data?: T;
  error?: Error;
}

export interface FetchState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs `load` whenever `key` changes and drops stale answers: a slow response for the
 * previous key can never overwrite the current one, and a key change is `loading` immediately.
 */
export function useFetch<T>(key: string, load: (signal: AbortSignal) => Promise<T>): FetchState<T> {
  const [state, setState] = useState<State<T>>({ key: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ key, error: error instanceof Error ? error : new Error(String(error)) });
      });
    return () => controller.abort();
    // `load` is intentionally not a dependency: callers pass inline closures and `key` identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const reload = useCallback(() => {
    setState({ key: '' });
    setAttempt((n) => n + 1);
  }, []);

  const current = state.key === key;
  return { data: current ? state.data : undefined, error: current ? state.error : undefined, loading: !current, reload };
}
