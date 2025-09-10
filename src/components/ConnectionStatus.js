import React, { useState, useEffect } from 'react';
import { createSupabaseClient } from '../config/supabase';

const ConnectionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isLoading: true,
    storageMode: 'localStorage',
    error: null
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const supabaseClient = await createSupabaseClient();
        
        if (supabaseClient) {
          // Test the connection with a simple query
          const { error } = await supabaseClient
            .from('players')
            .select('count', { count: 'exact', head: true });
          
          if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found"
            setConnectionStatus({
              isConnected: false,
              isLoading: false,
              storageMode: 'localStorage',
              error: error.message
            });
          } else {
            setConnectionStatus({
              isConnected: true,
              isLoading: false,
              storageMode: 'Supabase',
              error: null
            });
          }
        } else {
          setConnectionStatus({
            isConnected: false,
            isLoading: false,
            storageMode: 'localStorage',
            error: 'No Supabase credentials'
          });
        }
      } catch (error) {
        setConnectionStatus({
          isConnected: false,
          isLoading: false,
          storageMode: 'localStorage',
          error: error.message
        });
      }
    };

    checkConnection();
  }, []);

  const getStatusColor = () => {
    if (connectionStatus.isLoading) return '#f59e0b'; // amber
    if (connectionStatus.isConnected) return '#10b981'; // green
    return '#6b7280'; // gray
  };

  const getStatusText = () => {
    if (connectionStatus.isLoading) return 'Checking...';
    return connectionStatus.storageMode;
  };

  const getTooltipText = () => {
    if (connectionStatus.isLoading) return 'Checking database connection...';
    if (connectionStatus.isConnected) return 'Connected to Supabase database - data syncs across devices';
    if (connectionStatus.error) return `Local storage mode - ${connectionStatus.error}`;
    return 'Local storage mode - data stored locally only';
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
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatus;
