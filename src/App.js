import React, { useState, useEffect, useCallback } from 'react';
import SessionHamburgerMenu from './components/SessionHamburgerMenu';
import SessionPlayerManagement from './components/SessionPlayerManagement';
import CurrentMatches from './components/CurrentMatches';
import Notification from './components/Notification';
import Scoreboard from './components/Scoreboard';
import ConnectionStatus from './components/ConnectionStatus';
import { useLocalStorage } from './hooks/useLocalStorage';
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
  // Global storage
  const [globalPlayers, setGlobalPlayers] = useLocalStorage('badminton-global-players', []);
  const [sessions, setSessions] = useLocalStorage('badminton-sessions', []);
  const [currentSessionId, setCurrentSessionId] = useLocalStorage('badminton-current-session', null);
  
  // UI state
  const [notification, setNotification] = useState(null);

  // Initialize current session if valid session exists
  useEffect(() => {
    if (sessions.length > 0) {
      if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
        setCurrentSessionId(sessions[0].id);
      }
    } else {
      setCurrentSessionId(null);
    }
  }, [sessions, currentSessionId, setCurrentSessionId]);

  // Initialize court states for existing sessions that might not have them
  useEffect(() => {
    const sessionsNeedingCourtStates = sessions.filter(session => 
      !session.courtStates || session.courtStates.length === 0
    );
    
    if (sessionsNeedingCourtStates.length > 0) {
      setSessions(prev => prev.map(session => {
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
  }, [sessions, setSessions]);

  // Initialize ELO for existing global players
  useEffect(() => {
    const playersNeedingELO = globalPlayers.filter(player => !player.hasOwnProperty('elo'));
    if (playersNeedingELO.length > 0) {
      setGlobalPlayers(prev => prev.map(player => {
        if (!player.hasOwnProperty('elo')) {
          return {
            ...player,
            elo: calculateInitialELO(player.wins || 0, player.losses || 0)
          };
        }
        return player;
      }));
    }
  }, []);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  // Get session players with their session-specific stats
  const sessionPlayers = currentSession ? 
    currentSession.playerIds.map(playerId => {
      const globalPlayer = globalPlayers.find(p => p.id === playerId);
      if (!globalPlayer) return null;
      
      const sessionStats = getSessionPlayerStats(globalPlayer, currentSessionId);
      return {
        ...globalPlayer,
        ...sessionStats,
        sessionWins: sessionStats.sessionWins || 0,
        sessionLosses: sessionStats.sessionLosses || 0,
        sessionMatchCount: sessionStats.sessionMatchCount || 0,
        sessionLastMatchTime: sessionStats.sessionLastMatchTime || null,
        isActive: sessionStats.isActive !== undefined ? sessionStats.isActive : true
      };
    }).filter(Boolean) : [];

  // Get occupied player IDs from all active sessions
  const occupiedPlayerIds = sessions.flatMap(session => {
    if (session.id === currentSessionId) return []; // Don't include current session
    return session.currentMatches?.flatMap(match => {
      const playerIds = [
        match.team1?.player1?.id,
        match.team1?.player2?.id,
        match.team2?.player1?.id,
        match.team2?.player2?.id
      ].filter(Boolean); // Remove null/undefined values
      return playerIds;
    }) || [];
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

  const handleSessionSelect = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
    showNotification(`Switched to session: ${sessions.find(s => s.id === sessionId)?.name}`);
  }, [sessions, setCurrentSessionId, showNotification]);

  const handleSessionCreate = useCallback((newSession) => {
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    showNotification(`Created new session: ${newSession.name}`);
  }, [setSessions, setCurrentSessionId, showNotification]);


  const handleSessionEnd = useCallback((sessionId) => {
    const targetSessionId = sessionId || currentSessionId;
    
    // Delete the specified session completely
    setSessions(prev => prev.filter(s => s.id !== targetSessionId));
    
    // If ending current session, handle navigation
    if (targetSessionId === currentSessionId) {
      const remainingSessions = sessions.filter(s => s.id !== targetSessionId);
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
  }, [currentSessionId, sessions, setSessions, setCurrentSessionId, showNotification]);

  const handleAddPlayerToSession = useCallback((playerId) => {
    if (!currentSession) return;
    
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          playerIds: [...session.playerIds, playerId],
          lastActiveAt: new Date().toISOString()
        };
      }
      return session;
    }));
    
    const player = globalPlayers.find(p => p.id === playerId);
    showNotification(`${player?.name} added to session`);
  }, [currentSession, currentSessionId, globalPlayers, setSessions, showNotification]);

  const handleRemovePlayerFromSession = useCallback((playerId) => {
    if (!currentSession) return;
    
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          playerIds: session.playerIds.filter(id => id !== playerId),
          lastActiveAt: new Date().toISOString()
        };
      }
      return session;
    }));
    
    const player = globalPlayers.find(p => p.id === playerId);
    showNotification(`${player?.name} removed from session`);
  }, [currentSession, currentSessionId, globalPlayers, setSessions, showNotification]);

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
    
    // Add to current session
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          playerIds: [...session.playerIds, newPlayer.id],
          lastActiveAt: new Date().toISOString()
        };
      }
      return session;
    }));
    
    showNotification(`Created and added ${name} to session`);
  }, [currentSessionId, setGlobalPlayers, setSessions, showNotification]);

  const handleUpdateGlobalPlayer = useCallback((id, updates) => {
    setGlobalPlayers(prev => prev.map(player => {
      if (player.id === id) {
        return { ...player, ...updates };
      }
      return player;
    }));
  }, [setGlobalPlayers]);

  const completeMatch = useCallback((courtId, winner) => {
    if (!currentSession) return;
    
    const court = currentSession.courtStates?.find(c => c.id === courtId);
    if (!court || !court.currentMatch) return;

    const match = court.currentMatch;
    
    if (winner === 'cancelled') {
      showNotification('Match cancelled - no stats recorded');
    } else {
      // Update player stats (both global lifetime and session-specific)
      const winningTeam = winner === 'team1' ? match.team1 : match.team2;
      const losingTeam = winner === 'team1' ? match.team2 : match.team1;
      
      setGlobalPlayers(prev => prev.map(globalPlayer => {
        const isWinner = winningTeam.player1.id === globalPlayer.id || winningTeam.player2.id === globalPlayer.id;
        const isLoser = losingTeam.player1.id === globalPlayer.id || losingTeam.player2.id === globalPlayer.id;
        
        if (isWinner || isLoser) {
          // Update lifetime stats
          const currentELO = globalPlayer.elo || calculateInitialELO(globalPlayer.wins || 0, globalPlayer.losses || 0);
          const newELO = updateELO(currentELO, isWinner);
          
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
      
      showNotification(`Team ${winner === 'team1' ? '1' : '2'} wins!`);
    }

    // Update session: clear the court and remove match
    updateSession({
      courtStates: currentSession.courtStates.map(c => 
        c.id === courtId ? { ...c, isOccupied: false, currentMatch: null } : c
      ),
      currentMatches: currentSession.currentMatches.filter(m => m.courtId !== courtId)
    });
  }, [currentSession, currentSessionId, setGlobalPlayers, updateSession, showNotification]);

  // Available pool for current session
  const availablePool = sessionPlayers.filter(player => {
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
    if (!currentSession) return;
    
    if (sessionPlayers.filter(p => p.isActive).length < 4) {
      showNotification('Need at least 4 active players to generate matches', 'error');
      return;
    }

    const activePlayers = sessionPlayers.filter(p => p.isActive);
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
    
    showNotification(`Generated ${newMatches.length} new matches`);
  }, [currentSession, sessionPlayers, updateSession, showNotification]);

  const clearMatches = useCallback(() => {
    if (!currentSession) return;
    
    updateSession({
      currentMatches: [],
      courtStates: currentSession.courtStates.map(court => ({
        ...court,
        isOccupied: false,
        currentMatch: null
      }))
    });
    
    showNotification('All matches cleared');
  }, [currentSession, updateSession, showNotification]);

  const fillEmptyCourt = useCallback((courtId, matchData = null) => {
    if (!currentSession) return;
    
    if (matchData) {
      // Use the match data from the modal
      const match = {
        ...matchData,
        id: generateId(),
        courtId,
        startTime: new Date().toISOString(),
        completed: false
      };

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
  }, [currentSession, availablePool, updateSession, showNotification]);

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
                  sessions={sessions}
                  currentSessionId={null}
                  onSessionSelect={handleSessionSelect}
                  onSessionCreate={handleSessionCreate}
                  onSessionEnd={handleSessionEnd}
                />
              </div>
              
              {globalPlayers.length > 0 && (
                <div className="welcome-leaderboard">
                  <h3>🏆 Lifetime Leaderboard</h3>
                  <div className="leaderboard-list">
                    {globalPlayers
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
                  {globalPlayers.length > 10 && (
                    <p className="leaderboard-note">
                      Showing top 10 of {globalPlayers.length} players
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
            sessions={sessions}
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
          globalPlayers={globalPlayers}
          sessionPlayers={sessionPlayers}
          sessionId={currentSessionId}
          occupiedPlayerIds={occupiedPlayerIds}
          onAddPlayerToSession={handleAddPlayerToSession}
          onRemovePlayerFromSession={handleRemovePlayerFromSession}
          onUpdateGlobalPlayer={handleUpdateGlobalPlayer}
          onCreateNewPlayer={handleCreateNewPlayer}
        />

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <Scoreboard players={sessionPlayers} />
        
        {/* Connection status indicator */}
        <ConnectionStatus />
      </div>
    </div>
  );
}

export default App; 