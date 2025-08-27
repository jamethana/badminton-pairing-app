import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useFirebaseSync } from './useFirebaseSync';

export const useHybridStorage = (key, initialValue = [], useFirebase = false) => {
  // Local storage hook for offline functionality
  const [localData, setLocalData] = useLocalStorage(key, initialValue);
  
  // Firebase hook for online synchronization
  const firebaseHook = useFirebaseSync(key, initialValue);
  
  // State to track online/offline status
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync local data with Firebase when online
  useEffect(() => {
    if (isOnline && useFirebase && firebaseHook.data.length > 0) {
      setSyncStatus('syncing');
      try {
        // Merge local and remote data, preferring remote for conflicts
        const mergedData = mergeData(localData, firebaseHook.data);
        setLocalData(mergedData);
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        console.error('Sync error:', error);
      }
    }
  }, [isOnline, useFirebase, firebaseHook.data, localData, setLocalData]);

  // Merge function to handle data conflicts
  const mergeData = (local, remote) => {
    if (!Array.isArray(local) || !Array.isArray(remote)) {
      return remote || local;
    }

    // Create a map of remote data by ID
    const remoteMap = new Map(remote.map(item => [item.id, item]));
    
    // Merge local data with remote, preferring remote for conflicts
    const merged = local.map(localItem => {
      const remoteItem = remoteMap.get(localItem.id);
      if (remoteItem) {
        remoteMap.delete(localItem.id);
        // Prefer remote data if it's newer
        return remoteItem.lastModified > localItem.lastModified ? remoteItem : localItem;
      }
      return localItem;
    });

    // Add any remaining remote items
    remoteMap.forEach(item => merged.push(item));
    
    return merged;
  };

  // Add item function
  const addItem = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: item.id || Date.now().toString(),
      lastModified: new Date().toISOString()
    };

    // Always update local storage
    setLocalData(prev => [...prev, newItem]);

    // Update Firebase if online and enabled
    if (isOnline && useFirebase) {
      try {
        await firebaseHook.addItem(newItem);
      } catch (error) {
        console.error('Failed to sync to Firebase:', error);
      }
    }

    return newItem.id;
  }, [setLocalData, isOnline, useFirebase, firebaseHook]);

  // Update item function
  const updateItem = useCallback(async (id, updates) => {
    const updatedItem = {
      ...updates,
      lastModified: new Date().toISOString()
    };

    // Update local storage
    setLocalData(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      )
    );

    // Update Firebase if online and enabled
    if (isOnline && useFirebase) {
      try {
        await firebaseHook.updateItem(id, updatedItem);
      } catch (error) {
        console.error('Failed to sync to Firebase:', error);
      }
    }
  }, [setLocalData, isOnline, useFirebase, firebaseHook]);

  // Remove item function
  const removeItem = useCallback(async (id) => {
    // Remove from local storage
    setLocalData(prev => prev.filter(item => item.id !== id));

    // Remove from Firebase if online and enabled
    if (isOnline && useFirebase) {
      try {
        await firebaseHook.removeItem(id);
      } catch (error) {
        console.error('Failed to sync to Firebase:', error);
      }
    }
  }, [setLocalData, isOnline, useFirebase, firebaseHook]);

  // Set data function
  const setData = useCallback(async (newData) => {
    const dataWithTimestamps = newData.map(item => ({
      ...item,
      lastModified: new Date().toISOString()
    }));

    // Update local storage
    setLocalData(dataWithTimestamps);

    // Update Firebase if online and enabled
    if (isOnline && useFirebase) {
      try {
        await firebaseHook.setData(dataWithTimestamps);
      } catch (error) {
        console.error('Failed to sync to Firebase:', error);
      }
    }
  }, [setLocalData, isOnline, useFirebase, firebaseHook]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!isOnline || !useFirebase) return;

    setSyncStatus('syncing');
    try {
      // Force a sync by updating local data with Firebase data
      const mergedData = mergeData(localData, firebaseHook.data);
      setLocalData(mergedData);
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      console.error('Manual sync error:', error);
    }
  }, [isOnline, useFirebase, localData, firebaseHook.data, setLocalData]);

  return {
    data: localData,
    loading: firebaseHook.loading,
    error: firebaseHook.error,
    isOnline,
    syncStatus,
    addItem,
    updateItem,
    removeItem,
    setData,
    syncNow
  };
}; 