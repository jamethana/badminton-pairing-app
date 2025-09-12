import { useCallback, useState } from 'react';
import { 
  generateId, 
  calculateInitialELO, 
  calculateELOChange,
  calculateTeamELO,
  updateConfidence,
  ELO_CONFIG
} from '../utils/helpers';
import { generateSmartMatch, getMatchPreview } from '../utils/smartMatching';

/**
 * Custom hook for managing match operations
 * Handles match generation, completion, court management, and ELO calculations
 */
export function useMatchManagement({
  currentSession,
  currentSessionId,
  sessionPlayersWithDetails,
  globalPlayers,
  setGlobalPlayers,
  sessionPlayers,
  setSessionPlayers,
  matches,
  setMatches,
  setEloHistory,
  updateSession
}) {
  const [isCompletingMatch, setIsCompletingMatch] = useState(false);

  // Safe arrays
  const safeGlobalPlayers = globalPlayers || [];
  const safeMatches = matches || [];

  // Available pool for current session
  const availablePool = sessionPlayersWithDetails.filter(player => {
    const isInMatch = currentSession?.currentMatches?.some(match => {
      const playerIds = [
        match.team1?.player1?.id,
        match.team1?.player2?.id,
        match.team2?.player1?.id,
        match.team2?.player2?.id
      ].filter(Boolean);
      
      return playerIds.includes(player.id);
    });
    return player.isActive && !isInMatch;
  });

  // Complete match handler
  const completeMatch = useCallback(async (courtId, winner) => {
    console.log(`🏸 completeMatch called: courtId=${courtId}, winner=${winner}`);
    
    if (!currentSession) {
      console.log(`❌ No currentSession - aborting match completion`);
      return { success: false, message: 'No active session' };
    }

    setIsCompletingMatch(true);
    
    try {
      const court = currentSession.courtStates?.find(c => c.id === courtId);
      
      if (!court || !court.currentMatch) {
        console.log(`❌ No court or currentMatch - aborting match completion`);
        return { success: false, message: 'No match found on court' };
      }

      const match = court.currentMatch;
      
      if (winner === 'cancelled') {
        // Cancel match - mark as cancelled in database
        setMatches(prev => prev.map(dbMatch => {
          if (dbMatch.session_name === currentSession.name && 
              dbMatch.court_number === courtId && 
              !dbMatch.completed_at && 
              !dbMatch.cancelled_at) {
            return {
              ...dbMatch,
              cancelled_at: new Date().toISOString()
            };
          }
          return dbMatch;
        }));
        
        // Clear court
        updateSession({
          courtStates: currentSession.courtStates.map(c => 
            c.id === courtId ? { ...c, isOccupied: false, currentMatch: null } : c
          ),
          currentMatches: currentSession.currentMatches.filter(m => m.courtId !== courtId)
        });
        
        return { success: true, message: 'Match cancelled - no stats recorded' };
      }

      // Complete match with winner
      let completedMatch = null;
      
      setMatches(prev => {
        const updated = prev.map(dbMatch => {
          if (dbMatch.session_name === currentSession.name && 
              dbMatch.court_number === courtId && 
              !dbMatch.completed_at && 
              !dbMatch.cancelled_at) {
            
            completedMatch = {
              ...dbMatch,
              completed_at: new Date().toISOString(),
              winning_team: winner === 'team1' ? 1 : 2
            };
            return completedMatch;
          }
          return dbMatch;
        });
        return updated;
      });
      
      if (!completedMatch) {
        // Create new match record if not found
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
          team1_player1_name: match.team1.player1.name,
          team1_player2_name: match.team1.player2.name,
          team2_player1_name: match.team2.player1.name,
          team2_player2_name: match.team2.player2.name,
          winning_team: winner === 'team1' ? 1 : 2,
          match_type: 'doubles'
        };
        setMatches(prev => [...prev, completedMatch]);
      }
      
      // Update player stats
      const winningTeam = winner === 'team1' ? match.team1 : match.team2;
      const losingTeam = winner === 'team1' ? match.team2 : match.team1;
      
      const eloChanges = [];
      const sessionPlayerUpdates = [];
      
      // Update global players
      setGlobalPlayers(prev => {
        return prev.map(globalPlayer => {
          const isWinner = winningTeam.player1.id === globalPlayer.id || winningTeam.player2.id === globalPlayer.id;
          const isLoser = losingTeam.player1.id === globalPlayer.id || losingTeam.player2.id === globalPlayer.id;
          
          if (isWinner || isLoser) {
            const currentELO = globalPlayer.elo || calculateInitialELO(globalPlayer.wins || 0, globalPlayer.losses || 0);
            const matchCount = globalPlayer.matchCount || 0;
            const confidence = updateConfidence(
              globalPlayer.confidence || 1.0, 
              matchCount, 
              isWinner ? 'win' : 'loss'
            );
            
            // Calculate team ELOs for proper opponent rating
            const playerTeam = isWinner ? winningTeam : losingTeam;
            const opponentTeam = isWinner ? losingTeam : winningTeam;
            
            const teammatePlayer = safeGlobalPlayers.find(p => 
              p.id !== globalPlayer.id && 
              (p.id === playerTeam.player1.id || p.id === playerTeam.player2.id)
            );
            const opponent1Player = safeGlobalPlayers.find(p => p.id === opponentTeam.player1.id);
            const opponent2Player = safeGlobalPlayers.find(p => p.id === opponentTeam.player2.id);
            
            const teammateELO = teammatePlayer ? (teammatePlayer.elo || calculateInitialELO(teammatePlayer.wins || 0, teammatePlayer.losses || 0)) : currentELO;
            const opponent1ELO = opponent1Player ? (opponent1Player.elo || calculateInitialELO(opponent1Player.wins || 0, opponent1Player.losses || 0)) : ELO_CONFIG.STARTING_ELO;
            const opponent2ELO = opponent2Player ? (opponent2Player.elo || calculateInitialELO(opponent2Player.wins || 0, opponent2Player.losses || 0)) : ELO_CONFIG.STARTING_ELO;
            
            const playerTeamELO = calculateTeamELO(currentELO, teammateELO);
            const opponentTeamELO = calculateTeamELO(opponent1ELO, opponent2ELO);
            
            // Calculate ELO change
            const eloResult = calculateELOChange({
              playerELO: currentELO,
              opponentELO: opponentTeamELO,
              isWin: isWinner,
              matchCount,
              confidence
            });
            
            const newELO = eloResult.newELO;
            
            // Record ELO change for history
            eloChanges.push({
              id: generateId(),
              player_id: globalPlayer.id,
              match_id: completedMatch.id,
              session_id: currentSessionId,
              player_name: globalPlayer.name,
              session_name: currentSession.name,
              elo_before: currentELO,
              elo_after: newELO,
              elo_change: eloResult.eloChange,
              was_winner: isWinner,
              opponent_elo: opponentTeamELO,
              expected_score: eloResult.expectedScore,
              k_factor: eloResult.kFactor,
              player_team_elo: playerTeamELO,
              opponent_team_elo: opponentTeamELO,
              match_count: matchCount,
              confidence: confidence,
              created_at: new Date().toISOString()
            });
            
            // Collect session player update
            sessionPlayerUpdates.push({
              playerId: globalPlayer.id,
              playerName: globalPlayer.name,
              isWinner,
              isLoser,
              newELO
            });
            
            return {
              ...globalPlayer,
              wins: (globalPlayer.wins || 0) + (isWinner ? 1 : 0),
              losses: (globalPlayer.losses || 0) + (isLoser ? 1 : 0),
              matchCount: (globalPlayer.matchCount || 0) + 1,
              lastMatchTime: new Date().toISOString(),
              elo: newELO,
              confidence: confidence
            };
          }
          return globalPlayer;
        });
      });
      
      // Update session players
      if (sessionPlayerUpdates.length > 0) {
        setSessionPlayers(prevSessionPlayers => {
          return prevSessionPlayers.map((sessionPlayer) => {
            const isCurrentSession = sessionPlayer.session_id === currentSessionId;
            if (!isCurrentSession) return sessionPlayer;
            
            const updateInfo = sessionPlayerUpdates.find(update => {
              const sessionPlayerGlobal = safeGlobalPlayers.find(p => p.id === sessionPlayer.player_id);
              return sessionPlayerGlobal && sessionPlayerGlobal.id === update.playerId;
            });
            
            if (updateInfo) {
              return {
                ...sessionPlayer,
                session_wins: (sessionPlayer.session_wins || 0) + (updateInfo.isWinner ? 1 : 0),
                session_losses: (sessionPlayer.session_losses || 0) + (updateInfo.isLoser ? 1 : 0),
                session_matches: (sessionPlayer.session_matches || 0) + 1,
                session_elo_current: updateInfo.newELO,
                session_elo_peak: Math.max(sessionPlayer.session_elo_peak || updateInfo.newELO, updateInfo.newELO),
                last_match_time: new Date().toISOString()
              };
            }
            return sessionPlayer;
          });
        });
      }
      
      // Save ELO history
      if (eloChanges.length > 0) {
        setEloHistory(prev => [...prev, ...eloChanges]);
      }
      
      // Clear court
      updateSession({
        courtStates: currentSession.courtStates.map(c => 
          c.id === courtId ? { ...c, isOccupied: false, currentMatch: null } : c
        ),
        currentMatches: currentSession.currentMatches.filter(m => m.courtId !== courtId)
      });
      
      // Wait for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: `Team ${winner === 'team1' ? '1' : '2'} wins!` };
      
    } catch (error) {
      console.error('❌ Error completing match:', error);
      return { success: false, message: 'Error completing match. Please try again.' };
    } finally {
      setIsCompletingMatch(false);
    }
  }, [currentSession, currentSessionId, setGlobalPlayers, setMatches, setEloHistory, setSessionPlayers, updateSession, safeGlobalPlayers]);

  // Generate matches handler
  const generateMatches = useCallback(() => {
    if (!currentSession) {
      return { success: false, message: 'No active session' };
    }
    
    if (sessionPlayersWithDetails.filter(p => p.isActive).length < 4) {
      return { success: false, message: 'Need at least 4 active players to generate matches' };
    }

    const activePlayers = sessionPlayersWithDetails.filter(p => p.isActive);
    const newMatches = [];
    const usedPlayers = new Set();

    // Generate matches for each court
    for (let i = 0; i < currentSession.courtCount; i++) {
      if (activePlayers.length - usedPlayers.size < 4) break;

      const availablePlayers = activePlayers.filter(p => !usedPlayers.has(p.id));
      
      // Use smart matching if enabled
      const useSmartMatching = currentSession.smartMatching?.enabled || false;
      const matchSelection = generateSmartMatch(availablePlayers, safeMatches, useSmartMatching);
      
      if (!matchSelection) break;
      
      // Mark selected players as used
      matchSelection.players.forEach(player => usedPlayers.add(player.id));
      
      const match = {
        id: generateId(),
        courtId: i,
        matchType: 'doubles',
        team1: matchSelection.teams.team1,
        team2: matchSelection.teams.team2,
        startTime: new Date().toISOString(),
        completed: false,
        matchingData: {
          method: matchSelection.method,
          score: matchSelection.score?.total || 0,
          teamELOs: getMatchPreview(
            matchSelection.teams.team1.player1,
            matchSelection.teams.team1.player2,
            matchSelection.teams.team2.player1,
            matchSelection.teams.team2.player2
          )
        }
      };

      newMatches.push(match);
      
      // Save as incomplete match to database
      const dbMatch = {
        id: generateId(),
        session_name: currentSession.name,
        court_number: i,
        started_at: new Date().toISOString(),
        completed_at: null,
        cancelled_at: null,
        team1_player1_id: matchSelection.teams.team1.player1.id,
        team1_player2_id: matchSelection.teams.team1.player2.id,
        team2_player1_id: matchSelection.teams.team2.player1.id,
        team2_player2_id: matchSelection.teams.team2.player2.id,
        team1_player1_name: matchSelection.teams.team1.player1.name,
        team1_player2_name: matchSelection.teams.team1.player2.name,
        team2_player1_name: matchSelection.teams.team2.player1.name,
        team2_player2_name: matchSelection.teams.team2.player2.name,
        winning_team: null,
        match_type: 'doubles'
      };
      
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
    
    updateSession({
      currentMatches: newMatches,
      courtStates: newCourtStates
    });
    
    return { success: true, message: `Generated ${newMatches.length} new matches` };
  }, [currentSession, sessionPlayersWithDetails, currentSessionId, setMatches, updateSession, safeMatches]);

  // Clear matches handler
  const clearMatches = useCallback(() => {
    if (!currentSession) return { success: false, message: 'No active session' };
    
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
    
    return { success: true, message: 'All matches cleared' };
  }, [currentSession, safeMatches, setMatches, updateSession]);

  // Fill empty court handler
  const fillEmptyCourt = useCallback(async (courtId, matchData = null) => {
    if (!currentSession) {
      return { success: false, message: 'No active session' };
    }
    
    if (matchData) {
      // Create match with provided data
      const tempMatchId = generateId();
      const dbMatchData = {
        id: tempMatchId,
        session_name: currentSession.name,
        court_number: courtId,
        started_at: new Date().toISOString(),
        completed_at: null,
        cancelled_at: null,
        team1_player1_id: matchData.team1.player1.id,
        team1_player2_id: matchData.team1.player2?.id || null,
        team2_player1_id: matchData.team2.player1.id,
        team2_player2_id: matchData.team2.player2?.id || null,
        team1_player1_name: matchData.team1.player1.name,
        team1_player2_name: matchData.team1.player2?.name || null,
        team2_player1_name: matchData.team2.player1.name,
        team2_player2_name: matchData.team2.player2?.name || null,
        winning_team: null,
        match_type: matchData.matchType || 'doubles'
      };
      
      setMatches(prev => [...prev, dbMatchData]);
      
      // Clear currentMatches to trigger reconstruction with proper UUIDs
      updateSession({
        currentMatches: [],
        courtStates: currentSession.courtStates.map(c => ({ ...c, isOccupied: false, currentMatch: null }))
      });
      
      return { success: true, message: 'Court filled - match saved to database' };
    } else {
      // Random selection fallback
      if (availablePool.length < 4) {
        return { success: false, message: 'Need at least 4 available players to fill court' };
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
      
      return { success: true, message: 'Court filled with random players' };
    }
  }, [currentSession, availablePool, setMatches, updateSession]);

  // Court management
  const addCourt = useCallback(() => {
    if (!currentSession) return { success: false, message: 'No active session' };
    
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
    
    return { success: true, message: 'Court added' };
  }, [currentSession, updateSession]);

  const removeCourt = useCallback(() => {
    if (!currentSession || currentSession.courtStates.length <= 1) {
      return { success: false, message: 'Cannot remove the last court' };
    }
    
    // Check if any court has active players
    const hasActivePlayers = currentSession.courtStates.some(court => court.isOccupied);
    if (hasActivePlayers) {
      return { success: false, message: 'Cannot remove courts while there are active matches. Please complete or clear all matches first.' };
    }
    
    updateSession({
      courtCount: Math.max(1, currentSession.courtCount - 1),
      courtStates: currentSession.courtStates.slice(0, -1)
    });
    
    return { success: true, message: 'Court removed' };
  }, [currentSession, updateSession]);

  return {
    // State
    availablePool,
    isCompletingMatch,
    
    // Handlers
    completeMatch,
    generateMatches,
    clearMatches,
    fillEmptyCourt,
    addCourt,
    removeCourt
  };
}
