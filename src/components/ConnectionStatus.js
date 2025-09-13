import React, { useState, useEffect } from 'react';
import { createSupabaseClient, resetSupabaseClient, reportCertificateError } from '../config/supabase';

const ConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Check basic internet connectivity first
        if (!navigator.onLine) {
          setConnectionStatus({
            isOnline: false,
            isLoading: false,
            error: 'No internet connection'
          });
          return;
        }

        const supabaseClient = await createSupabaseClient();
        
        if (!supabaseClient) {
          setConnectionStatus({
            isOnline: false,
            isLoading: false,
            error: 'Failed to create Supabase client'
          });
          return;
        }

        // Test the connection with a more thorough check
        try {
          const { data, error } = await supabaseClient
            .from('players')
            .select('count', { count: 'exact', head: true });
          
          if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01') {
              // Table not found - this means we're connected but schema needs setup
              setConnectionStatus({
                isOnline: true,
                isLoading: false,
                error: 'Database schema not created'
              });
            } else {
              // Other connection error - likely network/internet issue
              setConnectionStatus({
                isOnline: false,
                isLoading: false,
                error: `Connection failed: ${error.message}`
              });
            }
          } else {
            // Successfully connected and tables exist
            setConnectionStatus({
              isOnline: true,
              isLoading: false,
              error: null
            });
          }
        } catch (queryError) {
          // Check if this is a certificate error and report it
          if (queryError.message.includes('ERR_CERT_AUTHORITY_INVALID') || 
              queryError.message.includes('net::ERR_CERT_AUTHORITY_INVALID')) {
            console.warn('🔒 Certificate error detected in ConnectionStatus');
            reportCertificateError();
            
            // Try once more with a fresh client
            try {
              const freshClient = await createSupabaseClient(true); // Force refresh
              if (freshClient) {
                const { data, error } = await freshClient
                  .from('players')
                  .select('count', { count: 'exact', head: true });
                
                if (!error) {
                  setConnectionStatus({
                    isOnline: true,
                    isLoading: false,
                    error: null
                  });
                  return; // Success with fresh client
                }
              }
            } catch (retryError) {
              console.warn('Retry with fresh client also failed:', retryError.message);
            }
          }
          
          setConnectionStatus({
            isOnline: false,
            isLoading: false,
            error: `Network error: ${queryError.message}`
          });
        }
      } catch (error) {
        setConnectionStatus({
          isOnline: false,
          isLoading: false,
          error: error.message
        });
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Network came back online - resetting Supabase client');
      resetSupabaseClient(); // Reset client when network comes back online
      checkConnection();
    };
    const handleOffline = () => {
      setConnectionStatus({
        isOnline: false,
        isLoading: false,
        error: 'Internet connection lost'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (connectionStatus.isLoading) return '#f59e0b'; // amber
    if (connectionStatus.isOnline) return '#10b981'; // green
    return '#ef4444'; // red for offline
  };

  const getStatusText = () => {
    if (connectionStatus.isLoading) return 'Connecting...';
    return connectionStatus.isOnline ? 'Online' : 'Offline';
  };

  const getTooltipText = () => {
    if (connectionStatus.isLoading) return 'Checking internet and database connection...';
    if (connectionStatus.isOnline) {
      if (connectionStatus.error) {
        return `⚠️ Online but ${connectionStatus.error}`;
      }
      return '✅ Connected to internet and database';
    }
    return `❌ ${connectionStatus.error || 'No internet connection'}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: `1px solid ${getStatusColor()}`,
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: getStatusColor(),
        cursor: 'help',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
      }}
      title={getTooltipText()}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            animation: connectionStatus.isLoading ? 'pulse 1.5s infinite' : 'none'
          }}
        />
        <span>{getStatusText()}</span>
      </div>
      
      {/* Add CSS animation for loading pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatus;
