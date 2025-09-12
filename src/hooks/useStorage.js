import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient, TABLES } from '../config/supabase';

/**
 * Unified storage hook that handles both localStorage and Supabase
 * Automatically falls back to localStorage if Supabase is unavailable
 * Provides a consistent interface for data persistence
 */
export function useStorage(key, initialValue = []) {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [useSupabase, setUseSupabase] = useState(false);
  const [error, setError] = useState(null);

  // Initialize storage and determine which backend to use
  useEffect(() => {
    let isMounted = true;
    
    const initializeStorage = async () => {
      try {
        // Try to initialize Supabase for supported keys
        const supabaseKeys = [
          'badminton-global-players',
          'badminton-sessions', 
          'badminton_session_players',
          'badminton_matches',
          'badminton_elo_history'
        ];
        
        if (supabaseKeys.includes(key)) {
          const client = await createSupabaseClient();
          
          if (client && isMounted) {
            setSupabaseClient(client);
            setUseSupabase(true);
            await loadFromSupabase(client, key);
          } else if (isMounted) {
            setUseSupabase(false);
            loadFromLocalStorage();
          }
        } else {
          // Use localStorage for other keys
          if (isMounted) {
            setUseSupabase(false);
            loadFromLocalStorage();
          }
        }
      } catch (err) {
        console.error(`Error initializing storage for ${key}:`, err);
        if (isMounted) {
          setError(err.message);
          setUseSupabase(false);
          loadFromLocalStorage();
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeStorage();
    
    return () => {
      isMounted = false;
    };
  }, [key]);

  // Load data from localStorage
  const loadFromLocalStorage = () => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        setStoredValue(initialValue);
        return;
      }

      const parsed = JSON.parse(item);
      
      // Filter out null/undefined items from arrays
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(item => item !== null && item !== undefined);
        setStoredValue(filtered);
      } else {
        setStoredValue(parsed || initialValue);
      }
    } catch (err) {
      console.error(`Error loading from localStorage (${key}):`, err);
      setStoredValue(initialValue);
    }
  };

  // Load data from Supabase
  const loadFromSupabase = async (client, storageKey) => {
    try {
      const tableName = getTableName(storageKey);
      if (!tableName) {
        console.warn(`No table mapping for key: ${storageKey}`);
        loadFromLocalStorage();
        return;
      }

      const { data, error: supabaseError } = await client
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error(`Supabase error loading ${storageKey}:`, supabaseError);
        loadFromLocalStorage();
        return;
      }

      const processedData = data ? processSupabaseData(data, storageKey) : [];
      setStoredValue(processedData);
      
      // Also save to localStorage as backup
      window.localStorage.setItem(storageKey, JSON.stringify(processedData));
      
    } catch (err) {
      console.error(`Error loading from Supabase (${storageKey}):`, err);
      loadFromLocalStorage();
    }
  };

  // Save data to storage
  const setValue = useCallback(async (value) => {
    try {
      const valueToStore = typeof value === 'function' ? value(storedValue) : value;
      
      // Always update local state first for immediate UI updates
      setStoredValue(valueToStore);
      
      // Save to localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Save to Supabase if available
      if (useSupabase && supabaseClient) {
        await saveToSupabase(supabaseClient, key, valueToStore, storedValue);
      }
      
    } catch (err) {
      console.error(`Error saving to storage (${key}):`, err);
      setError(err.message);
    }
  }, [key, storedValue, useSupabase, supabaseClient]);

  // Save data to Supabase
  const saveToSupabase = async (client, storageKey, newData, oldData) => {
    try {
      const tableName = getTableName(storageKey);
      if (!tableName) return;

      // For arrays, perform differential sync
      if (Array.isArray(newData) && Array.isArray(oldData)) {
        await performDifferentialSync(client, tableName, newData, oldData, storageKey);
      } else {
        // For single values, just update
        console.log(`Updating single value for ${storageKey}`);
      }
      
    } catch (err) {
      console.error(`Error saving to Supabase (${storageKey}):`, err);
      throw err;
    }
  };

  // Perform differential sync for arrays
  const performDifferentialSync = async (client, tableName, newData, oldData, storageKey) => {
    const oldIds = new Set(oldData.map(item => item.id));
    const newIds = new Set(newData.map(item => item.id));
    
    // Find items to insert (new items)
    const toInsert = newData.filter(item => !oldIds.has(item.id));
    
    // Find items to update (existing items that changed)
    const toUpdate = newData.filter(item => {
      if (!oldIds.has(item.id)) return false;
      const oldItem = oldData.find(old => old.id === item.id);
      return JSON.stringify(item) !== JSON.stringify(oldItem);
    });
    
    // Find items to delete (items that were removed)
    const toDelete = oldData.filter(item => !newIds.has(item.id));

    // Perform operations
    if (toInsert.length > 0) {
      const insertData = toInsert.map(item => transformForSupabase(item, storageKey));
      const { error: insertError } = await client
        .from(tableName)
        .insert(insertData);
      
      if (insertError) {
        console.error(`Insert error for ${tableName}:`, insertError);
      }
    }

    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        const updateData = transformForSupabase(item, storageKey);
        const { error: updateError } = await client
          .from(tableName)
          .update(updateData)
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`Update error for ${tableName}:`, updateError);
        }
      }
    }

    if (toDelete.length > 0) {
      const deleteIds = toDelete.map(item => item.id);
      const { error: deleteError } = await client
        .from(tableName)
        .delete()
        .in('id', deleteIds);
      
      if (deleteError) {
        console.error(`Delete error for ${tableName}:`, deleteError);
      }
    }
  };

  // Map storage keys to Supabase table names
  const getTableName = (storageKey) => {
    const mapping = {
      'badminton-global-players': 'players',
      'badminton-sessions': 'sessions',
      'badminton_session_players': 'session_players',
      'badminton_matches': 'matches',
      'badminton_elo_history': 'elo_history'
    };
    return mapping[storageKey];
  };

  // Transform data for Supabase storage
  const transformForSupabase = (item, storageKey) => {
    // Remove any UI-specific fields and transform as needed
    const { sessionStats, ...cleanItem } = item;
    
    // Add timestamps if missing
    if (!cleanItem.created_at) {
      cleanItem.created_at = new Date().toISOString();
    }
    cleanItem.updated_at = new Date().toISOString();
    
    return cleanItem;
  };

  // Process data loaded from Supabase
  const processSupabaseData = (data, storageKey) => {
    return data.map(item => {
      // Transform Supabase data back to application format
      return {
        ...item,
        // Add any computed fields or transformations needed
      };
    });
  };

  return [
    storedValue,
    setValue,
    {
      isLoading,
      useSupabase,
      error,
      supabaseClient
    }
  ];
}
