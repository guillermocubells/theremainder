import { useRef, useCallback } from "react";

const MAX_ENTRIES = 50;

export function useSearchCache<T>() {
  const cache = useRef(new Map<string, T>());

  const get = useCallback((key: string): T | undefined => {
    return cache.current.get(key);
  }, []);

  const set = useCallback((key: string, value: T) => {
    if (cache.current.size >= MAX_ENTRIES) {
      const firstKey = cache.current.keys().next().value;
      if (firstKey !== undefined) cache.current.delete(firstKey);
    }
    cache.current.set(key, value);
  }, []);

  return { get, set };
}
