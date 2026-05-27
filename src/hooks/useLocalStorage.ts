import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // localStorage might be full or unavailable
    }
  }, [key, val]);

  const setValue = useCallback(
    (newVal: T | ((prev: T) => T)) => {
      setVal((prev) => {
        const resolved = newVal instanceof Function ? newVal(prev) : newVal;
        return resolved;
      });
    },
    []
  );

  return [val, setValue];
}
