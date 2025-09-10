import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      
      const parsed = JSON.parse(item);
      
      // Validate that parsed data is not null/undefined
      if (parsed === null || parsed === undefined) {
        console.warn(`localStorage key "${key}" contains null/undefined, using initialValue`);
        return initialValue;
      }
      
      // If it's an array, filter out any null/undefined items
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(item => item !== null && item !== undefined);
        if (filtered.length !== parsed.length) {
          console.warn(`localStorage key "${key}" contained null items, filtered them out`);
        }
        return filtered;
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      console.warn(`Clearing corrupted localStorage key "${key}"`);
      window.localStorage.removeItem(key);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      setStoredValue(currentValue => {
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        
        // Filter out null/undefined items from arrays before storing
        let cleanedValue = valueToStore;
        if (Array.isArray(valueToStore)) {
          cleanedValue = valueToStore.filter(item => item !== null && item !== undefined);
          if (cleanedValue.length !== valueToStore.length) {
            console.warn(`Filtered out null/undefined items from ${key} before saving`);
          }
        }
        
        console.log(`useLocalStorage: Setting ${key} to:`, cleanedValue);
        
        // Save to local storage
        if (cleanedValue === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(cleanedValue));
          console.log(`useLocalStorage: Saved ${key} to localStorage`);
        }
        
        return cleanedValue;
      });
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
} 