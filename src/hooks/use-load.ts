import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/supabase';

// Loads data when the screen gains focus, with pull-to-refresh support.
export function useLoad<T>(loader: () => PromiseLike<{ data: unknown; error: unknown }>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const res = await loaderRef.current();
    if (res.error) setError(errorMessage(res.error));
    else {
      setError(null);
      setData((res.data ?? initial) as T);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  return { data, setData, loading, refreshing, error, refresh, reload: run };
}
