import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const localStorageChangeEvent = 'kappa-local-storage-change';

/**
 * A simple React hook that synchronizes a piece of state with
 * `localStorage`. When the returned setter is called the value is
 * immediately persisted under the provided key. If the storage contains a
 * value already it will be used to initialize the state instead of the
 * provided default.
 *
 * @param key The localStorage key under which to store the value
 * @param initialValue The default value to use when no stored value exists
 */
export default function useLocalStorage<T>(key: string, initialValue: T) {
  const readStoredValue = useCallback(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn('Error reading localStorage key', key, error);
      return initialValue;
    }
  }, [initialValue, key]);

  // Initialize state from localStorage or fall back to the initial value
  const [storedValue, setStoredValue] = useState<T>(readStoredValue);

  useEffect(() => {
    const syncValue = () => setStoredValue(readStoredValue());

    window.addEventListener('storage', syncValue);
    window.addEventListener(localStorageChangeEvent, syncValue);

    return () => {
      window.removeEventListener('storage', syncValue);
      window.removeEventListener(localStorageChangeEvent, syncValue);
    };
  }, [readStoredValue]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
    try {
      const nextValue = value instanceof Function ? value(readStoredValue()) : value;
      setStoredValue(nextValue);
      window.localStorage.setItem(key, JSON.stringify(nextValue));
      window.dispatchEvent(new Event(localStorageChangeEvent));
    } catch (error) {
      console.warn('Error writing localStorage key', key, error);
    }
  }, [key, readStoredValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn('Error writing localStorage key', key, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
