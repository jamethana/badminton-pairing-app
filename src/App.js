import React, { useState, useEffect, useCallback } from 'react';
import SessionHamburgerMenu from './components/SessionHamburgerMenu';
import SessionPlayerManagement from './components/SessionPlayerManagement';
import CurrentMatches from './components/CurrentMatches';
import Notification from './components/Notification';
import Scoreboard from './components/Scoreboard';
import ConnectionStatus from './components/ConnectionStatus';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSupabaseStorage } from './hooks/useSupabaseStorage';
import { 
  generateId, 
  calculateInitialELO, 
  updateELO, 
  initializeSessionStats,
  createNewSession,
  getSessionPlayerStats,
  updateSessionPlayerStats,
  getELOTier
} from './utils/helpers';

function App() {
  // Global storage with automatic Supabase integration
  const [globalPlayers, setGlobalPlayers, playersInfo] = useSupabaseStorage('badminton-global-players', []);
  const [sessions, setSessions, sessionsInfo] = useSupabaseStorage('badminton-sessions', []);
  const [sessionPlayers, setSessionPlayers] = useSupabaseStorage('badminton_session_players', []);
  const [matches, setMatches] = useSupabaseStorage('badminton_matches', []);
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
  const safeMatches = matches || [];

  // Initialize current session if valid session exists
  useEffect(() => {
    const activeSessions = safeSessions.filter(s => s.isActive !== false);
    if (activeSessions.length > 0) {
      if (!currentSessionId || !activeSessions.find(s => s.id === currentSessionId)) {
        setCurrentSessionId(activeSessions[0].id);
      }
    } else {
      setCurrentSessionId(null);
    }
  }, [safeSessions, currentSessionId, setCurrentSessionId]);

  // Initialize court states for existing sessions that might not have them
  useEffect(() => {
    const sessionsNeedingCourtStates = safeSessions.filter(session => 
      !session.courtStates || session.courtStates.length === 0
    );
    
    if (sessionsNeedingCourtStates.length > 0) {
      setSessions(prev => (prev || []).map(session => {
        if (!session.courtStates || session.courtStates.length === 0) {
          const courtStates = [];
          for (let i = 0; i < (session.courtCount || 4); i++) {
            courtStates.push({
          id: i,
          isOccupied: false,
          currentMatch: null
        });
      }
          return {
            ...session,
            courtStates: courtStates,
            currentMatches: session.currentMatches || []
          };
        }
        return session;
      }));
    }
  }, [safeSessions, setSessions]);

  // Initialize ELO for existing global players
  useEffect(() => {
    const playersNeedingELO = safeGlobalPlayers.filter(player => player && !player.hasOwnProperty('elo'));
    if (playersNeedingELO.length > 0) {
      setGlobalPlayers(prev => (prev || []).map(player => {
        if (!player.hasOwnProperty('elo')) {
          return {
            ...player,
            elo: calculateInitialELO(player.wins || 0, player.losses || 0)
          };
        }
        return player;
      }));
    }
  }, [safeGlobalPlayers, setGlobalPlayers]);

  const currentSession = safeSessions.find(s => s && s.id === currentSessionId && s.isActive !== false);
  
  // Get session players with their session-specific stats from session_players table
  const currentSessionPlayers = sessionPlayers.filter(sp => 
    sp && sp.session_id === currentSessionId && sp.is_active_in_session
  );
  
  const sessionPlayersWithDetails = currentSessionPlayers.map(sessionPlayer => {
    const globalPlayer = safeGlobalPlayers.find(p => p && p.id === sessionPlayer.player_id);
    if (!globalPlayer) return null;
    
    return {
      ...globalPlayer,
      // Use session-specific stats from session_players table
      sessionWins: sessionPlayer.session_wins || 0,
      sessionLosses: sessionPlayer.session_losses || 0,
      sessionMatchCount: sessionPlayer.session_matches || 0,
      sessionLastMatchTime: sessionPlayer.joined_at,
      isActive: sessionPlayer.is_active_in_session !== false,
      sessionElo: sessionPlayer.session_elo_current || globalPlayer.elo || 100
    };
  }).filter(Boolean);
  
  // For backward compatibility, maintain the sessionPlayers variable name
  const sessionPlayersArray = sessionPlayersWithDetails;

  // Get occupied player IDs from all active sessions
  const occupiedPlayerIds = (safeSessions || []).flatMap(session => {
    if (session.id === currentSessionId) return []; // Don't include current session
    return (session.currentMatches || []).flatMap(match => {
      const playerIds = [
        match.team1?.player1?.id,
        match.team1?.player2?.id,
        match.team2?.player1?.id,
        match.team2?.player2?.id
      ].filter(Boolean); // Remove null/undefined values
      return playerIds;
    });
  });

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Session update function (define early so other functions can use it)
  const updateSession = useCallback((updates) => {
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          ...updates,
          lastActiveAt: new Date().toISOString()
        };
      }
      return session;
    }));
  }, [currentSessionId, setSessions]);

  // Reconstruct current matches and court states from matches data
  useEffect(() => {
    console.log(`🔄 Match reconstruction effect triggered`);
    console.log(`📊 currentSession:`, currentSession);
    console.log(`📊 matches:`, safeMatches);
    console.log(`📊 currentSessionId:`, currentSessionId);
    
    if (!currentSession || !currentSessionId) {
      console.log(`❌ Missing data for reconstruction - aborting`);
      return;
    }
    
    // Prevent infinite loop: only reconstruct if currentMatches is empty
    if (currentSession.currentMatches && currentSession.currentMatches.length > 0) {
      console.log(`⚠️ currentMatches already exists, skipping reconstruction`);
      return;
    }
    
    // Find active (incomplete) matches for this session
    const activeMatches = safeMatches.filter(match => {
      const isForThisSession = match && match.session_name === currentSession.name;
      const isNotCompleted = !match.completed_at;
      const isNotCancelled = !match.cancelled_at;
      
      console.log(`🔍 Checking match ${match?.id}:`, {
        isForThisSession,
        isNotCompleted,
        isNotCancelled,
        cancelled_at: match?.cancelled_at,
        completed_at: match?.completed_at,
        session_name: match?.session_name
      });
      
      return isForThisSession && isNotCompleted && isNotCancelled;
    });
    
    console.log(`🔍 Found ${activeMatches.length} active matches for session "${currentSession.name}"`);
    console.log(`📋 Active matches:`, activeMatches);
    
    if (activeMatches.length > 0) {
      console.log(`🔄 Reconstructing ${activeMatches.length} active matches for session`);
      
      // Convert database matches back to UI format
      const currentMatches = activeMatches.map(match => ({
        id: match.id,
        courtId: match.court_number,
        team1: {
          player1: safeGlobalPlayers.find(p => p.name === match.team1_player1_name) || { id: match.team1_player1_id, name: match.team1_player1_name },
          player2: safeGlobalPlayers.find(p => p.name === match.team1_player2_name) || { id: match.team1_player2_id, name: match.team1_player2_name }
        },
        team2: {
          player1: safeGlobalPlayers.find(p => p.name === match.team2_player1_name) || { id: match.team2_player1_id, name: match.team2_player1_name },
          player2: safeGlobalPlayers.find(p => p.name === match.team2_player2_name) || { id: match.team2_player2_id, name: match.team2_player2_name }
        },
        startTime: match.started_at,
        completed: false
      }));
      
      // Reconstruct court states
      const courtStates = [];
      for (let i = 0; i < currentSession.courtCount; i++) {
        const matchOnCourt = currentMatches.find(m => m.courtId === i);
        courtStates.push({
          id: i,
          isOccupied: !!matchOnCourt,
          currentMatch: matchOnCourt || null
        });
      }
      
      // Update session with reconstructed data (but don't sync to Supabase)
      updateSession({
        currentMatches,
        courtStates
      });
    }
  }, [safeMatches, currentSessionId, safeGlobalPlayers, updateSession]);

  const handleSessionSelect = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
    showNotification(`Switched to session: ${safeSessions.find(s => s && s.id === sessionId)?.name}`);
  }, [safeSessions, setCurrentSessionId, showNotification]);

  const handleSessionCreate = useCallback((newSession) => {
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    showNotification(`Created new session: ${newSession.name}`);
  }, [setSessions, setCurrentSessionId, showNotification]);


  const handleSessionEnd = useCallback((sessionId) => {
    const targetSessionId = sessionId || currentSessionId;
    
    // Mark the session as ended (don't delete it completely)
    setSessions(prev => prev.map(session => {
      if (session.id === targetSessionId) {
        return {
          ...session,
          isActive: false,
          ended_at: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
      }
      return session;
    }));
    
    // If ending current session, handle navigation
    if (targetSessionId === currentSessionId) {
      const remainingSessions = safeSessions.filter(s => s && s.id !== targetSessionId && s.isActive !== false);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
        showNotification(`Session ended. Switched to: ${remainingSessions[0].name}`);
      } else {
        setCurrentSessionId(null);
        showNotification('Session ended - returned to main menu');
      }
    } else {
      showNotification('Session ended');
    }
  }, [currentSessionId, safeSessions, setSessions, setCurrentSessionId, showNotification]);

  const handleAddPlayerToSession = useCallback((playerId) => {
    if (!currentSession) return;
    
    // Check if player is already in this session
    const existingSessionPlayer = sessionPlayers.find(sp => 
      sp.session_id === currentSessionId && sp.player_id === playerId && sp.is_active_in_session
    );
    
    if (existingSessionPlayer) {
      showNotification('Player is already in this session', 'error');
      return;
    }
    
    // Get player's current ELO to set as starting ELO
    const player = safeGlobalPlayers.find(p => p && p.id === playerId);
    if (!player) return;
    
    const currentELO = player.elo || 100;
    
    // Create new session player relationship
    const newSessionPlayer = {
      id: generateId(),
      session_id: currentSessionId,
      player_id: playerId,
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
    showNotification(`${player.name} added to session`);
  }, [currentSession, currentSessionId, sessionPlayers, safeGlobalPlayers, setSessionPlayers, showNotification]);

  const handleRemovePlayerFromSession = useCallback((playerId) => {
    if (!currentSession) return;
    
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
    showNotification(`${player?.name} removed from session`);
  }, [currentSession, currentSessionId, safeGlobalPlayers, setSessionPlayers, showNotification]);

  const handleCreateNewPlayer = useCallback((name) => {
    const newPlayer = {
      id: generateId(),
      name: name.trim(),
      matchCount: 0,
      wins: 0,
      losses: 0,
      lastMatchTime: null,
      elo: 100,
      sessionStats: {}
    };

    setGlobalPlayers(prev => [...prev, newPlayer]);
    
    // Add to current session via session_players table
    const newSessionPlayer = {
      id: generateId(),
      session_id: currentSessionId,
      player_id: newPlayer.id,
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
    
    showNotification(`Created and added ${name} to session`);
  }, [currentSessionId, setGlobalPlayers, setSessionPlayers, showNotification]);

  const handleUpdateGlobalPlayer = useCallback((id, updates) => {
    setGlobalPlayers(prev => prev.map(player => {
      if (player.id === id) {
        return { ...player, ...updates };
      }
      return player;
    }));
  }, [setGlobalPlayers]);

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
  }, [currentSessionId, setSessionPlayers]);

  const completeMatch = useCallback((courtId, winner) => {
    console.log(`🏸 completeMatch called: courtId=${courtId}, winner=${winner}`);
    console.log(`📊 currentSession:`, currentSession);
    
    if (!currentSession) {
      console.log(`❌ No currentSession - aborting match completion`);
      return;
    }
    
    console.log(`📊 courtStates:`, currentSession.courtStates);
    const court = currentSession.courtStates?.find(c => c.id === courtId);
    console.log(`📊 found court:`, court);
    
    if (!court || !court.currentMatch) {
      console.log(`❌ No court or currentMatch - aborting match completion`);
      return;
    }

    const match = court.currentMatch;
    console.log(`🏸 Processing match:`, match);
    
    if (winner === 'cancelled') {
      console.log(`🏸 Cancelling match with ID: ${match.id}`);
      
      // Find and update ALL active matches on this court to mark them as cancelled
      setMatches(prev => prev.map(dbMatch => {
        if (dbMatch.session_name === currentSession.name && 
            dbMatch.court_number === courtId && 
            !dbMatch.completed_at && 
            !dbMatch.cancelled_at) {
          console.log(`✅ Marking match as cancelled:`, dbMatch.id);
          return {
            ...dbMatch,
            cancelled_at: new Date().toISOString()
          };
        }
        return dbMatch;
      }));
      
      showNotification('Match cancelled - no stats recorded');
    } else {
      console.log(`🏸 Completing match with ID: ${match.id}, winner: ${winner}`);
      
      // Find and update ALL active matches on this court - complete one, cancel others
      let completedMatch = null;
      setMatches(prev => prev.map(dbMatch => {
        if (dbMatch.session_name === currentSession.name && 
            dbMatch.court_number === courtId && 
            !dbMatch.completed_at && 
            !dbMatch.cancelled_at) {
          
          // If this is the first match found, complete it; cancel others
          if (!completedMatch) {
            console.log(`✅ Marking match as completed:`, dbMatch.id);
            completedMatch = {
              ...dbMatch,
              completed_at: new Date().toISOString(),
              winning_team: winner === 'team1' ? 1 : 2
            };
            return completedMatch;
          } else {
            console.log(`🚫 Cancelling duplicate match on same court:`, dbMatch.id);
            return {
              ...dbMatch,
              cancelled_at: new Date().toISOString()
            };
          }
        }
        return dbMatch;
      }));
      
      if (!completedMatch) {
        console.log(`⚠️ Could not find match to complete, creating new record`);
        completedMatch = {
          id: generateId(),
          session_name: currentSession.name,
          court_number: courtId,
          started_at: match.startTime,
          completed_at: new Date().toISOString(),
          team1_player1_id: match.team1.player1.id,
          team1_player2_id: match.team1.player2.id,
          team2_player1_id: match.team2.player1.id,
          team2_player2_id: match.team2.player2.id,
          // Add names for Supabase UUID resolution
          team1_player1_name: match.team1.player1.name,
          team1_player2_name: match.team1.player2.name,
          team2_player1_name: match.team2.player1.name,
          team2_player2_name: match.team2.player2.name,
          winning_team: winner === 'team1' ? 1 : 2,
          match_type: 'doubles'
        };
        setMatches(prev => [...prev, completedMatch]);
      }
      
      // Update player stats (both global lifetime and session-specific)
      const winningTeam = winner === 'team1' ? match.team1 : match.team2;
      const losingTeam = winner === 'team1' ? match.team2 : match.team1;
      
      // Collect ELO changes for history
      const eloChanges = [];
      
      setGlobalPlayers(prev => prev.map(globalPlayer => {
        const isWinner = winningTeam.player1.id === globalPlayer.id || winningTeam.player2.id === globalPlayer.id;
        const isLoser = losingTeam.player1.id === globalPlayer.id || losingTeam.player2.id === globalPlayer.id;
        
        if (isWinner || isLoser) {
          // Update lifetime stats
          const currentELO = globalPlayer.elo || calculateInitialELO(globalPlayer.wins || 0, globalPlayer.losses || 0);
          const newELO = updateELO(currentELO, isWinner);
          
          // Record ELO change for history
          eloChanges.push({
            id: generateId(),
            player_id: globalPlayer.id,
            match_id: completedMatch.id,
            session_id: currentSessionId,
            // Add names for Supabase UUID resolution
            player_name: globalPlayer.name,
            session_name: currentSession.name,
            elo_before: currentELO,
            elo_after: newELO,
            elo_change: newELO - currentELO,
            was_winner: isWinner,
            opponent_elo: 100, // We'll calculate average opponent ELO properly later
            created_at: new Date().toISOString()
          });
          
          // Update session stats
          const sessionStats = getSessionPlayerStats(globalPlayer, currentSessionId);
          const updatedSessionStats = {
            ...sessionStats,
            sessionWins: (sessionStats.sessionWins || 0) + (isWinner ? 1 : 0),
            sessionLosses: (sessionStats.sessionLosses || 0) + (isLoser ? 1 : 0),
            sessionMatchCount: (sessionStats.sessionMatchCount || 0) + 1,
            sessionLastMatchTime: new Date().toISOString()
          };
          
          return {
            ...globalPlayer,
            // Update lifetime stats
            wins: (globalPlayer.wins || 0) + (isWinner ? 1 : 0),
            losses: (globalPlayer.losses || 0) + (isLoser ? 1 : 0),
            matchCount: (globalPlayer.matchCount || 0) + 1,
            lastMatchTime: new Date().toISOString(),
            elo: newELO,
            // Update session stats
            sessionStats: {
              ...globalPlayer.sessionStats,
              [currentSessionId]: updatedSessionStats
            }
          };
        }
        return globalPlayer;
      }));
      
      // Save ELO history
      if (eloChanges.length > 0) {
        setEloHistory(prev => [...prev, ...eloChanges]);
      }
      
      showNotification(`Team ${winner === 'team1' ? '1' : '2'} wins!`);
    }

    // Update session: clear the court and remove match
    updateSession({
      courtStates: currentSession.courtStates.map(c => 
        c.id === courtId ? { ...c, isOccupied: false, currentMatch: null } : c
      ),
      currentMatches: currentSession.currentMatches.filter(m => m.courtId !== courtId)
    });
  }, [currentSession, currentSessionId, setGlobalPlayers, setMatches, setEloHistory, updateSession, showNotification]);

  // Available pool for current session
  const availablePool = sessionPlayersArray.filter(player => {
    const isInMatch = currentSession?.currentMatches?.some(match => {
      const playerIds = [
        match.team1?.player1?.id,
        match.team1?.player2?.id,
        match.team2?.player1?.id,
        match.team2?.player2?.id
      ].filter(Boolean); // Remove null/undefined values
      
      return playerIds.includes(player.id);
    });
    return player.isActive && !isInMatch;
  });

  // Court management functions
  const addCourt = useCallback(() => {
    if (!currentSession) return;
    
    updateSession({
      courtCount: currentSession.courtCount + 1,
      courtStates: [
        ...currentSession.courtStates,
        {
          id: currentSession.courtStates.length,
      isOccupied: false,
      currentMatch: null
        }
      ]
    });
    
    showNotification('Court added');
  }, [currentSession, updateSession, showNotification]);

  const removeCourt = useCallback(() => {
    if (!currentSession || currentSession.courtStates.length <= 1) {
      showNotification('Cannot remove the last court', 'error');
      return;
    }
    
    // Check if any court has active players
    const hasActivePlayers = currentSession.courtStates.some(court => court.isOccupied);
    if (hasActivePlayers) {
      showNotification('Cannot remove courts while there are active matches. Please complete or clear all matches first.', 'error');
      return;
    }
    
    updateSession({
      courtCount: Math.max(1, currentSession.courtCount - 1),
      courtStates: currentSession.courtStates.slice(0, -1)
    });
    
    showNotification('Court removed');
  }, [currentSession, updateSession, showNotification]);

  const generateMatches = useCallback(() => {
    console.log(`🎯 generateMatches called`);
    console.log(`📊 currentSession:`, currentSession);
    console.log(`📊 sessionPlayersArray:`, sessionPlayersArray);
    
    if (!currentSession) {
      console.log(`❌ No currentSession in generateMatches`);
      return;
    }
    
    if (sessionPlayersArray.filter(p => p.isActive).length < 4) {
      console.log(`❌ Not enough active players: ${sessionPlayersArray.filter(p => p.isActive).length}`);
      showNotification('Need at least 4 active players to generate matches', 'error');
      return;
    }

    const activePlayers = sessionPlayersArray.filter(p => p.isActive);
    const newMatches = [];
    const usedPlayers = new Set();

    // Generate matches for each court
    for (let i = 0; i < currentSession.courtCount; i++) {
      if (activePlayers.length - usedPlayers.size < 4) break;

      const availablePlayers = activePlayers.filter(p => !usedPlayers.has(p.id));
      const selectedPlayers = [];
      
      // Select 4 random players
      for (let j = 0; j < 4; j++) {
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const player = availablePlayers[randomIndex];
        selectedPlayers.push(player);
        usedPlayers.add(player.id);
        availablePlayers.splice(randomIndex, 1);
      }

      // Simple team formation (first 2 vs last 2)
      const match = {
        id: generateId(),
        courtId: i,
        team1: {
          player1: selectedPlayers[0],
          player2: selectedPlayers[1]
        },
        team2: {
          player1: selectedPlayers[2],
          player2: selectedPlayers[3]
        },
        startTime: new Date().toISOString(),
        completed: false
      };

      newMatches.push(match);
      
      // Also save as incomplete match to database for persistence
      const dbMatch = {
        id: generateId(),
        session_name: currentSession.name,
        court_number: i,
        started_at: new Date().toISOString(),
        completed_at: null,
        cancelled_at: null,
        team1_player1_id: selectedPlayers[0].id,
        team1_player2_id: selectedPlayers[1].id,
        team2_player1_id: selectedPlayers[2].id,
        team2_player2_id: selectedPlayers[3].id,
        // Add names for Supabase UUID resolution
        team1_player1_name: selectedPlayers[0].name,
        team1_player2_name: selectedPlayers[1].name,
        team2_player1_name: selectedPlayers[2].name,
        team2_player2_name: selectedPlayers[3].name,
        session_name: currentSession.name,
        winning_team: null,
        match_type: 'doubles'
      };
      
      // Save to matches database
      setMatches(prev => [...prev, dbMatch]);
    }

    // Update session with new matches and court states
    const newCourtStates = currentSession.courtStates.map((court, index) => {
      const match = newMatches.find(m => m.courtId === index);
      return {
        ...court,
        isOccupied: !!match,
        currentMatch: match || null
      };
    });

    console.log(`🏸 Updating session with ${newMatches.length} matches and court states:`, newCourtStates);
    
    updateSession({
      currentMatches: newMatches,
      courtStates: newCourtStates
    });
    
    showNotification(`Generated ${newMatches.length} new matches`);
  }, [currentSession, sessionPlayersArray, currentSessionId, setMatches, updateSession, showNotification]);

  const clearMatches = useCallback(() => {
    if (!currentSession) return;
    
    // Mark all active matches as cancelled in database
    const activeMatches = safeMatches.filter(match => 
      match && match.session_name === currentSession.name && 
      !match.completed_at && 
      !match.cancelled_at
    );
    
    if (activeMatches.length > 0) {
      setMatches(prev => prev.map(match => {
        if (match.session_name === currentSession.name && !match.completed_at && !match.cancelled_at) {
          return {
            ...match,
            cancelled_at: new Date().toISOString()
          };
        }
        return match;
      }));
    }
    
    updateSession({
      currentMatches: [],
      courtStates: currentSession.courtStates.map(court => ({
        ...court,
        isOccupied: false,
        currentMatch: null
      }))
    });
    
    showNotification('All matches cleared');
  }, [currentSession, currentSessionId, safeMatches, setMatches, updateSession, showNotification]);

  const fillEmptyCourt = useCallback((courtId, matchData = null) => {
    console.log(`🏸 fillEmptyCourt called: courtId=${courtId}, matchData=`, matchData);
    
    if (!currentSession) {
      console.log(`❌ No currentSession in fillEmptyCourt`);
      return;
    }
    
    if (matchData) {
      // Use the match data from the modal
      const match = {
        ...matchData,
        id: generateId(),
        courtId,
        startTime: new Date().toISOString(),
        completed: false
      };

      console.log(`🏸 Created match for court:`, match);

      // Save match to database as incomplete match
      const dbMatch = {
        id: generateId(),
        // Use session name for consistent resolution, not UUID
        session_name: currentSession.name,
        court_number: courtId,
        started_at: new Date().toISOString(),
        completed_at: null,
        cancelled_at: null,
        team1_player1_id: match.team1.player1.id,
        team1_player2_id: match.team1.player2?.id || null,
        team2_player1_id: match.team2.player1.id,
        team2_player2_id: match.team2.player2?.id || null,
        // Add names for Supabase UUID resolution
        team1_player1_name: match.team1.player1.name,
        team1_player2_name: match.team1.player2?.name || null,
        team2_player1_name: match.team2.player1.name,
        team2_player2_name: match.team2.player2?.name || null,
        winning_team: null,
        match_type: match.matchType || 'doubles'
      };
      
      console.log(`💾 Saving match to database:`, dbMatch);
      setMatches(prev => [...prev, dbMatch]);

      updateSession({
        currentMatches: [...currentSession.currentMatches, match],
        courtStates: currentSession.courtStates.map(c => 
        c.id === courtId ? { ...c, isOccupied: true, currentMatch: match } : c
        )
      });
      
      showNotification('Court filled with selected players');
    } else {
      // Fallback to random selection
      if (availablePool.length < 4) {
        showNotification('Need at least 4 available players to fill court', 'error');
        return;
      }

      const selectedPlayers = [];
      const poolCopy = [...availablePool];
      
      // Select 4 random players
      for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        selectedPlayers.push(poolCopy[randomIndex]);
        poolCopy.splice(randomIndex, 1);
      }
      
      const match = {
        id: generateId(),
        courtId,
        team1: {
          player1: selectedPlayers[0],
          player2: selectedPlayers[1]
        },
        team2: {
          player1: selectedPlayers[2],
          player2: selectedPlayers[3]
        },
        startTime: new Date().toISOString(),
        completed: false
      };

      updateSession({
        currentMatches: [...currentSession.currentMatches, match],
        courtStates: currentSession.courtStates.map(c => 
        c.id === courtId ? { ...c, isOccupied: true, currentMatch: match } : c
        )
      });
      
      showNotification('Court filled with random players');
    }
  }, [currentSession, currentSessionId, availablePool, setMatches, updateSession, showNotification]);

  // Show loading screen while data is being loaded
  if (isDataLoading) {
    return (
      <div className="App">
        <div className="container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ fontSize: '24px' }}>🏸</div>
          <div>Loading badminton data...</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {usingSupabase ? '📡 Syncing with Supabase...' : '📁 Loading from local storage...'}
          </div>
        </div>
        <ConnectionStatus />
      </div>
    );
  }

  // Show blank page with create session button if no sessions exist
  if (!currentSession) {
    return (
      <div className="App">
        <div className="container">
          <header className="app-header">
            <h1 className="app-title">🏸 Badminton Pairing App</h1>
          </header>
          
          <div className="no-sessions-page">
            <div className="no-sessions-content">
              <div className="welcome-message">
                <h2>Welcome to Badminton Pairing!</h2>
                <p>Create your first session to start organizing matches and tracking player stats.</p>
              </div>
              
              <div className="create-first-session">
                <SessionHamburgerMenu
                  sessions={safeSessions.filter(s => s.isActive !== false)}
                  currentSessionId={null}
                  onSessionSelect={handleSessionSelect}
                  onSessionCreate={handleSessionCreate}
                  onSessionEnd={handleSessionEnd}
                />
              </div>
              
              {safeGlobalPlayers.length > 0 && (
                <div className="welcome-leaderboard">
                  <h3>🏆 Lifetime Leaderboard</h3>
                  <div className="leaderboard-list">
                    {safeGlobalPlayers
                      .filter(player => player && player.id) // Filter out null/undefined players
                      .sort((a, b) => {
                        const eloA = a.elo || calculateInitialELO(a.wins || 0, a.losses || 0);
                        const eloB = b.elo || calculateInitialELO(b.wins || 0, b.losses || 0);
                        return eloB - eloA;
                      })
                      .slice(0, 10)
                      .map((player, index) => {
                        const elo = player.elo || calculateInitialELO(player.wins || 0, player.losses || 0);
                        const tier = getELOTier(elo);
                        return (
                          <div key={player.id} className="leaderboard-item">
                            <span className="rank">#{index + 1}</span>
                            <div className="player-info">
                              <span className="player-name">{player.name}</span>
                              <span className="player-stats">
                                {player.wins || 0}W - {player.losses || 0}L • ELO: {elo}
                              </span>
                            </div>
                            <span className="tier-badge" style={{ color: tier.color }}>
                              {tier.icon} {tier.name}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  {safeGlobalPlayers.length > 10 && (
                    <p className="leaderboard-note">
                      Showing top 10 of {safeGlobalPlayers.length} players
                    </p>
                  )}
                </div>
              )}

              <div className="features-preview">
                <h3>What you can do:</h3>
                <ul>
                  <li>🎯 Create multiple independent sessions</li>
                  <li>👥 Invite players and track their performance</li>
                  <li>🏸 Manage courts and organize matches</li>
                  <li>📊 View session and lifetime rankings</li>
                  <li>🏆 Track ELO ratings and player progression</li>
                </ul>
              </div>
            </div>
          </div>
          
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <header className="app-header">
        <SessionHamburgerMenu
          sessions={safeSessions.filter(s => s.isActive !== false)}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onSessionCreate={handleSessionCreate}
          onSessionEnd={handleSessionEnd}
        />
          <h1 className="app-title">🏸 Badminton Pairing App</h1>
        </header>

        <CurrentMatches
          currentMatches={currentSession.currentMatches || []}
          courtStates={currentSession.courtStates || []}
          courtCount={currentSession.courtCount || 4}
          availablePool={availablePool}
          onCompleteMatch={completeMatch}
          onFillCourt={fillEmptyCourt}
          onAddCourt={addCourt}
          onRemoveCourt={removeCourt}
          onGenerateMatches={generateMatches}
          onClearMatches={clearMatches}
        />

        <SessionPlayerManagement
          globalPlayers={safeGlobalPlayers}
          sessionPlayers={sessionPlayersArray}
          sessionId={currentSessionId}
          occupiedPlayerIds={occupiedPlayerIds}
          onAddPlayerToSession={handleAddPlayerToSession}
          onRemovePlayerFromSession={handleRemovePlayerFromSession}
          onUpdateGlobalPlayer={handleUpdateGlobalPlayer}
          onToggleSessionPlayerActive={handleToggleSessionPlayerActive}
          onCreateNewPlayer={handleCreateNewPlayer}
        />

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <Scoreboard players={sessionPlayersArray} />
        
        {/* Connection status indicator */}
        <ConnectionStatus />
      </div>
    </div>
  );
}

export default App; 