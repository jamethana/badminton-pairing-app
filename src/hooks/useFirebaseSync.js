import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { database } from '../config/firebase';

export const useFirebaseSync = (path, initialValue = []) => {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for real-time updates
  useEffect(() => {
    const dataRef = ref(database, path);
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const value = snapshot.val();
          setData(Array.isArray(value) ? value : []);
        } else {
          setData(initialValue);
        }
        setLoading(false);
        setError(null);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [path, initialValue]);

  // Add new item
  const addItem = useCallback(async (item) => {
    try {
      const dataRef = ref(database, path);
      const newItemRef = push(dataRef);
      await set(newItemRef, { ...item, id: newItemRef.key });
      return newItemRef.key;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [path]);

  // Update item
  const updateItem = useCallback(async (id, updates) => {
    try {
      const itemRef = ref(database, `${path}/${id}`);
      await update(itemRef, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [path]);

  // Remove item
  const removeItem = useCallback(async (id) => {
    try {
      const itemRef = ref(database, `${path}/${id}`);
      await remove(itemRef);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [path]);

  // Set entire data
  const setData = useCallback(async (newData) => {
    try {
      const dataRef = ref(database, path);
      await set(dataRef, newData);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [path]);

  return {
    data,
    loading,
    error,
    addItem,
    updateItem,
    removeItem,
    setData: setData
  };
};

// Specialized hooks for different data types
export const usePlayers = () => {
  return useFirebaseSync('players', []);
};

export const useMatches = () => {
  return useFirebaseSync('matches', []);
};

export const useCourts = () => {
  return useFirebaseSync('courts', 2);
};

export const useAvailablePool = () => {
  return useFirebaseSync('availablePool', []);
}; 