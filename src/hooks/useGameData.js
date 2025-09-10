// Custom hook for game data management
// Abstracts database operations and provides React state management

import { useState, useEffect, useCallback } from 'react';
import gameService from '../services/GameService';
import databaseService from '../services/DatabaseService';

export function useGameData() {
  const [players, setPlayers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Run migration for existing data
      await databaseService.migrateExistingData();
      
      // Load data
      const [playersData, sessionsData, currentId] = await Promise.all([
        databaseService.getPlayers(),
        databaseService.getSessions(),
        databaseService.get('current_session_id', null)
      ]);
      
      setPlayers(playersData);
      setSessions(sessionsData);
      setCurrentSessionId(currentId);
      
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshPlayers = useCallback(async () => {
    try {
      const playersData = await databaseService.getPlayers();
      setPlayers(playersData);
    } catch (err) {
      console.error('Error refreshing players:', err);
      setError(err.message);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const sessionsData = await databaseService.getSessions();
      setSessions(sessionsData);
    } catch (err) {
      console.error('Error refreshing sessions:', err);
      setError(err.message);
    }
  }, []);

  // Player operations
  const createPlayer = useCallback(async (name, email = null) => {
    try {
      const newPlayer = await gameService.createPlayer(name, email);
      await refreshPlayers();
      return newPlayer;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshPlayers]);

  const updatePlayer = useCallback(async (playerId, updates) => {
    try {
      const updatedPlayer = await databaseService.updatePlayer(playerId, updates);
      await refreshPlayers();
      return updatedPlayer;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshPlayers]);

  const deletePlayer = useCallback(async (playerId) => {
    try {
      await databaseService.deletePlayer(playerId);
      await refreshPlayers();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshPlayers]);

  // Session operations
  const createSession = useCallback(async (name, description = null) => {
    try {
      const newSession = await gameService.createSession(name, description);
      await refreshSessions();
      return newSession;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshSessions]);

  const selectSession = useCallback(async (sessionId) => {
    try {
      await databaseService.set('current_session_id', sessionId);
      setCurrentSessionId(sessionId);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const endSession = useCallback(async (sessionId = null) => {
    try {
      const targetSessionId = sessionId || currentSessionId;
      
      // End the session (mark as ended, don't delete)
      await databaseService.updateSession(targetSessionId, {
        ended_at: new Date().toISOString(),
        is_active: false
      });
      
      // If ending current session, clear current session ID
      if (targetSessionId === currentSessionId) {
        const remainingSessions = sessions.filter(s => s.id !== targetSessionId && s.is_active);
        if (remainingSessions.length > 0) {
          await selectSession(remainingSessions[0].id);
        } else {
          await databaseService.set('current_session_id', null);
          setCurrentSessionId(null);
        }
      }
      
      await refreshSessions();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [currentSessionId, sessions, selectSession, refreshSessions]);

  const addPlayerToSession = useCallback(async (sessionId, playerId) => {
    try {
      await gameService.addPlayerToSession(sessionId, playerId);
      await refreshSessions();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshSessions]);

  const removePlayerFromSession = useCallback(async (sessionId, playerId) => {
    try {
      await databaseService.removePlayerFromSession(sessionId, playerId);
      await refreshSessions();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshSessions]);

  // Match operations
  const completeMatch = useCallback(async (matchId, winnerTeam, scoreData = null) => {
    try {
      const completedMatch = await gameService.completeMatch(matchId, winnerTeam, scoreData);
      await Promise.all([refreshPlayers(), refreshSessions()]);
      return completedMatch;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [refreshPlayers, refreshSessions]);

  // Analytics
  const getPlayerStats = useCallback(async (playerId) => {
    try {
      return await gameService.getPlayerStats(playerId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getSessionStats = useCallback(async (sessionId) => {
    try {
      return await gameService.getSessionStats(sessionId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getMatchHistory = useCallback(async (playerId = null, sessionId = null, limit = 50) => {
    try {
      return await gameService.getMatchHistory(playerId, sessionId, limit);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getLeaderboard = useCallback(async (sessionId = null) => {
    try {
      return await gameService.generateLeaderboard(sessionId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Supabase integration methods (for future use)
  const connectToSupabase = useCallback(async (config) => {
    try {
      await databaseService.connectToSupabase(config);
      await databaseService.syncWithSupabase();
      await loadInitialData();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const enableRealtimeSync = useCallback(async () => {
    try {
      await databaseService.enableRealtimeSync();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    players,
    sessions,
    currentSessionId,
    loading,
    error,
    
    // Player operations
    createPlayer,
    updatePlayer,
    deletePlayer,
    
    // Session operations
    createSession,
    selectSession,
    endSession,
    addPlayerToSession,
    removePlayerFromSession,
    
    // Match operations
    completeMatch,
    
    // Analytics
    getPlayerStats,
    getSessionStats,
    getMatchHistory,
    getLeaderboard,
    
    // Database operations
    refreshPlayers,
    refreshSessions,
    
    // Supabase integration
    connectToSupabase,
    enableRealtimeSync,
    
    // Utilities
    clearError
  };
}
