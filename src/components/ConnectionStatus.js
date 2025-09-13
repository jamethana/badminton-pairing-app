import React, { useState, useEffect } from 'react';
import { createSupabaseClient, resetSupabaseClient } from '../config/supabase';

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

        // Simply check if we can create a Supabase client (no actual network requests)
        const supabaseClient = await createSupabaseClient();
        
        if (!supabaseClient) {
          setConnectionStatus({
            isOnline: false,
            isLoading: false,
            error: 'Supabase client not available'
          });
          return;
        }

        // If we can create a client and we're online, assume connection is good
        setConnectionStatus({
          isOnline: true,
          isLoading: false,
          error: null
        });
        
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

    // Check connection every 5 minutes (very infrequent since we're not making network requests)
    const interval = setInterval(checkConnection, 300000);

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
    if (connectionStatus.isLoading) return 'Checking...';
    return connectionStatus.isOnline ? 'Ready' : 'Offline';
  };

  const getTooltipText = () => {
    if (connectionStatus.isLoading) return 'Checking system status...';
    if (connectionStatus.isOnline) {
      if (connectionStatus.error) {
        return `⚠️ System ready but ${connectionStatus.error}`;
      }
      return '✅ System ready - Internet and Supabase client available';
    }
    return `❌ ${connectionStatus.error || 'System offline - No internet connection'}`;
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
