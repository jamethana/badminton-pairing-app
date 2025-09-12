import { useCallback } from 'react';
import { generateId, ELO_CONFIG } from '../utils/helpers';

/**
 * Custom hook for managing player operations
 * Handles player creation, session membership, and player state management
 */
export function usePlayerManagement({
  currentSession,
  currentSessionId,
  globalPlayers,
  setGlobalPlayers,
  sessionPlayers,
  setSessionPlayers
}) {
  // Safe arrays
  const safeGlobalPlayers = globalPlayers || [];

  // Get session players with their session-specific stats
  const currentSessionPlayers = sessionPlayers.filter(sp => 
    sp && sp.session_id === currentSessionId && sp.is_active_in_session
  );
  
  // Clean up duplicate session players (same player name in same session)
  const uniqueSessionPlayers = currentSessionPlayers.reduce((acc, sp) => {
    const globalPlayer = safeGlobalPlayers.find(p => p.id === sp.player_id);
    if (!globalPlayer) return acc;
    
    const key = `${sp.session_id}-${globalPlayer.name}`;
    if (!acc.has(key)) {
      acc.set(key, sp);
    } else {
      // Keep the one with more stats (more recent)
      const existing = acc.get(key);
      if ((sp.session_matches || 0) > (existing.session_matches || 0)) {
        acc.set(key, sp);
      }
    }
    return acc;
  }, new Map());
  
  const cleanedSessionPlayers = Array.from(uniqueSessionPlayers.values());
  
  // Session players with details
  const sessionPlayersWithDetails = cleanedSessionPlayers.map(sessionPlayer => {
    const globalPlayer = safeGlobalPlayers.find(p => p && p.id === sessionPlayer.player_id);
    if (!globalPlayer) return null;
    
    return {
      ...globalPlayer,
      // Use session-specific stats from session_players table
      sessionWins: sessionPlayer.session_wins || 0,
      sessionLosses: sessionPlayer.session_losses || 0,
      sessionMatchCount: sessionPlayer.session_matches || 0,
      sessionLastMatchTime: sessionPlayer.last_match_time || sessionPlayer.joined_at,
      isActive: sessionPlayer.is_active_in_session !== false,
      sessionElo: sessionPlayer.session_elo_current || globalPlayer.elo || 1200
    };
  }).filter(Boolean);

  // Add player to session handler
  const handleAddPlayerToSession = useCallback((playerId) => {
    if (!currentSession) return { success: false, message: 'No active session' };
    
    // Check if player is already in this session
    const existingSessionPlayer = sessionPlayers.find(sp => 
      sp.session_id === currentSessionId && sp.player_id === playerId && sp.is_active_in_session
    );
    
    if (existingSessionPlayer) {
      return { success: false, message: 'Player is already in this session' };
    }
    
    // Get player's current ELO to set as starting ELO
    const player = safeGlobalPlayers.find(p => p && p.id === playerId);
    if (!player) return { success: false, message: 'Player not found' };
    
    const currentELO = player.elo || ELO_CONFIG.STARTING_ELO;
    
    // Create new session player relationship
    const newSessionPlayer = {
      id: generateId(),
      session_id: currentSessionId,
      player_id: playerId,
      // Add name fields for Supabase UUID resolution
      player_name: player.name,
      session_name: currentSession.name,
      joined_at: new Date().toISOString(),
      left_at: null,
      session_matches: 0,
      session_wins: 0,
      session_losses: 0,
      session_elo_start: currentELO,
      session_elo_current: currentELO,
      session_elo_peak: currentELO,
      is_active_in_session: true
    };
    
    setSessionPlayers(prev => [...prev, newSessionPlayer]);
    return { success: true, message: `${player.name} added to session` };
  }, [currentSession, currentSessionId, sessionPlayers, safeGlobalPlayers, setSessionPlayers]);

  // Remove player from session handler
  const handleRemovePlayerFromSession = useCallback((playerId) => {
    if (!currentSession) return { success: false, message: 'No active session' };
    
    // Mark player as inactive in session (don't delete the record for historical purposes)
    setSessionPlayers(prev => prev.map(sessionPlayer => {
      if (sessionPlayer.session_id === currentSessionId && sessionPlayer.player_id === playerId) {
        return {
          ...sessionPlayer,
          is_active_in_session: false,
          left_at: new Date().toISOString()
        };
      }
      return sessionPlayer;
    }));
    
    const player = safeGlobalPlayers.find(p => p && p.id === playerId);
    return { success: true, message: `${player?.name} removed from session` };
  }, [currentSession, currentSessionId, safeGlobalPlayers, setSessionPlayers]);

  // Create new player handler
  const handleCreateNewPlayer = useCallback((name) => {
    const newPlayer = {
      id: generateId(),
      name: name.trim(),
      matchCount: 0,
      wins: 0,
      losses: 0,
      lastMatchTime: null,
      elo: ELO_CONFIG.STARTING_ELO,
      confidence: 0.5, // Start with minimum allowed confidence
      sessionStats: {}
    };

    setGlobalPlayers(prev => [...prev, newPlayer]);
    
    // Add to current session via session_players table
    if (currentSession) {
      const newSessionPlayer = {
        id: generateId(),
        session_id: currentSessionId,
        player_id: newPlayer.id,
        // Add name fields for Supabase UUID resolution
        player_name: newPlayer.name,
        session_name: currentSession.name,
        joined_at: new Date().toISOString(),
        left_at: null,
        session_matches: 0,
        session_wins: 0,
        session_losses: 0,
        session_elo_start: newPlayer.elo,
        session_elo_current: newPlayer.elo,
        session_elo_peak: newPlayer.elo,
        is_active_in_session: true
      };
      
      setSessionPlayers(prev => [...prev, newSessionPlayer]);
      return { success: true, message: `Created and added ${name} to session` };
    }
    
    return { success: true, message: `Created player ${name}` };
  }, [currentSessionId, currentSession, setGlobalPlayers, setSessionPlayers]);

  // Update global player handler
  const handleUpdateGlobalPlayer = useCallback((id, updates) => {
    setGlobalPlayers(prev => prev.map(player => {
      if (player.id === id) {
        return { ...player, ...updates };
      }
      return player;
    }));
    return { success: true, message: 'Player updated' };
  }, [setGlobalPlayers]);

  // Toggle session player active status
  const handleToggleSessionPlayerActive = useCallback((playerId, isActive) => {
    // Update the session player's active status in the session_players table
    setSessionPlayers(prev => prev.map(sessionPlayer => {
      if (sessionPlayer.session_id === currentSessionId && sessionPlayer.player_id === playerId) {
        return {
          ...sessionPlayer,
          is_active_in_session: isActive
        };
      }
      return sessionPlayer;
    }));
    return { success: true, message: `Player status updated` };
  }, [currentSessionId, setSessionPlayers]);

  return {
    // Computed state
    sessionPlayersWithDetails,
    safeGlobalPlayers,
    
    // Handlers
    handleAddPlayerToSession,
    handleRemovePlayerFromSession,
    handleCreateNewPlayer,
    handleUpdateGlobalPlayer,
    handleToggleSessionPlayerActive
  };
}
