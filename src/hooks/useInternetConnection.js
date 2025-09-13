import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../config/supabase';

export const useInternetConnection = () => {
  const [connectionState, setConnectionState] = useState({
    isOnline: false,
    isLoading: true,
    error: null,
    hasSupabase: false
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check basic internet connectivity first
        if (!navigator.onLine) {
          setConnectionState({
            isOnline: false,
            isLoading: false,
            error: 'No internet connection detected',
            hasSupabase: false
          });
          return;
        }

        // Check if Supabase is configured
        const supabaseClient = await createSupabaseClient();
        
        if (!supabaseClient) {
          setConnectionState({
            isOnline: false,
            isLoading: false,
            error: 'Failed to create Supabase client',
            hasSupabase: false
          });
          return;
        }

        // Test actual connectivity to Supabase
        try {
          const { data, error } = await supabaseClient
            .from('players')
            .select('count', { count: 'exact', head: true });
          
          if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01') {
              // Table not found - connected but schema needs setup
              setConnectionState({
                isOnline: true,
                isLoading: false,
                error: 'Database schema not created',
                hasSupabase: true
              });
            } else {
              // Other connection error
              setConnectionState({
                isOnline: false,
                isLoading: false,
                error: `Database connection failed: ${error.message}`,
                hasSupabase: false
              });
            }
          } else {
            // Fully connected and ready
            setConnectionState({
              isOnline: true,
              isLoading: false,
              error: null,
              hasSupabase: true
            });
          }
        } catch (queryError) {
          setConnectionState({
            isOnline: false,
            isLoading: false,
            error: `Network error: ${queryError.message}`,
            hasSupabase: false
          });
        }
      } catch (error) {
        setConnectionState({
          isOnline: false,
          isLoading: false,
          error: `Connection check failed: ${error.message}`,
          hasSupabase: false
        });
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setConnectionState(prev => ({ ...prev, isLoading: true }));
      checkConnection();
    };
    
    const handleOffline = () => {
      setConnectionState({
        isOnline: false,
        isLoading: false,
        error: 'Internet connection lost',
        hasSupabase: false
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnection();

    // Periodic checks every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return connectionState;
};
