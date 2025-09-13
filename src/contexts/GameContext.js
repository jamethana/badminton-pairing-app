import React, { createContext, useContext, useState } from 'react';
import { useSupabaseStorage } from '../hooks/useSupabaseStorage';
import { useLocalStorage } from '../hooks/useLocalStorage';

/**
 * Game Context - Provides global state management for the badminton application
 * Centralizes data storage, session management, and player management
 */
const GameContext = createContext();

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

export function GameProvider({ children }) {
  // Global storage with automatic Supabase integration
  const [globalPlayers, setGlobalPlayers, playersInfo] = useSupabaseStorage('badminton-global-players', []);
  const [sessions, setSessions, sessionsInfo] = useSupabaseStorage('badminton-sessions', []);
  const [sessionPlayers, setSessionPlayers] = useSupabaseStorage('badminton_session_players', []);
  // Note: matches are now loaded per-session in useSessionMatches hook for better performance
  const [eloHistory, setEloHistory] = useSupabaseStorage('badminton_elo_history', []);
  const [currentSessionId, setCurrentSessionId] = useLocalStorage('badminton-current-session', null);
  
  // UI state
  const [notification, setNotification] = useState(null);

  // Check if data is still loading
  const isDataLoading = playersInfo?.isLoading || sessionsInfo?.isLoading;
  const usingSupabase = playersInfo?.useSupabase || sessionsInfo?.useSupabase;
  
  // Ensure arrays are never undefined
  const safeGlobalPlayers = globalPlayers || [];
  const safeSessions = sessions || [];

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const contextValue = {
    // Data state
    globalPlayers: safeGlobalPlayers,
    setGlobalPlayers,
    sessions: safeSessions,
    setSessions,
    sessionPlayers,
    setSessionPlayers,
    eloHistory,
    setEloHistory,
    currentSessionId,
    setCurrentSessionId,
    
    // Loading state
    isDataLoading,
    usingSupabase,
    
    // UI state
    notification,
    setNotification,
    showNotification,
    
    // Storage info
    playersInfo,
    sessionsInfo
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}
