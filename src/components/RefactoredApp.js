import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';
import { useSessionManagement } from '../hooks/useSessionManagement';
import { usePlayerManagement } from '../hooks/usePlayerManagement';
import { useMatchManagement } from '../hooks/useMatchManagement';
import { useInternetConnection } from '../hooks/useInternetConnection';

// Components
import SessionOptionsMenu from './SessionOptionsMenu';
import SessionPlayerManagement from './SessionPlayerManagement';
import CurrentMatches from './CurrentMatches';
import Notification from './Notification';
import Scoreboard from './Scoreboard';
import ConnectionStatus from './ConnectionStatus';
import CreateFirstSessionButton from './CreateFirstSessionButton';
import OfflineBlocker from './OfflineBlocker';

// Utils
import { 
  calculateInitialELO,
  urlToSessionName
} from '../utils/helpers';

function RefactoredApp() {
  // Router params
  const { sessionName } = useParams();
  
  // Internet connection requirement
  const { isOnline, isLoading: connectionLoading, error: connectionError } = useInternetConnection();
  
  // Global context
  const {
    globalPlayers,
    setGlobalPlayers,
    sessions,
    setSessions,
    sessionPlayers,
    setSessionPlayers,
    matches,
    setMatches,
    eloHistory,
    setEloHistory,
    currentSessionId,
    setCurrentSessionId,
    isDataLoading,
    usingSupabase,
    notification,
    showNotification
  } = useGameContext();

  // Session management
  const {
    currentSession,
    safeSessions,
    isNavigatingHome,
    handleSessionSelect,
    handleSessionCreate,
    handleSessionEnd,
    handleNavigateHome,
    updateSession
  } = useSessionManagement(sessions, setSessions, currentSessionId, setCurrentSessionId);

  // Player management
  const {
    sessionPlayersWithDetails,
    safeGlobalPlayers,
    handleAddPlayerToSession,
    handleRemovePlayerFromSession,
    handleCreateNewPlayer,
    handleUpdateGlobalPlayer,
    handleToggleSessionPlayerActive
  } = usePlayerManagement({
    currentSession,
    currentSessionId,
    globalPlayers,
    setGlobalPlayers,
    sessionPlayers,
    setSessionPlayers
  });

  // Match management
  const {
    availablePool,
    isCompletingMatch,
    completeMatch,
    generateMatches,
    clearMatches,
    fillEmptyCourt,
    addCourt,
    removeCourt
  } = useMatchManagement({
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
  });

  // Sync URL with current session
  useEffect(() => {
    if (sessionName && safeSessions.length > 0) {
      // Find session by name from URL
      const sessionFromUrl = urlToSessionName(sessionName, safeSessions);
      
      if (sessionFromUrl && (sessionFromUrl.isActive !== false && sessionFromUrl.is_active !== false)) {
        // URL has valid session name, set it as current
        if (currentSessionId !== sessionFromUrl.id) {
          setCurrentSessionId(sessionFromUrl.id);
        }
      } else {
        // URL has invalid session name, redirect to home
        setCurrentSessionId(null);
        handleNavigateHome();
      }
    }
  }, [sessionName, safeSessions, currentSessionId, setCurrentSessionId, handleNavigateHome]);

  // Handle navigation to home page and clean up invalid sessions
  useEffect(() => {
    if (!sessionName) {
      // User navigated to home page (/) - clear current session to show welcome page
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
    }
  }, [sessionName, currentSessionId, setCurrentSessionId]);

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

  // Reconstruct current matches and court states from matches data
  useEffect(() => {
    if (!currentSession || !currentSessionId) return;
    
    // Prevent infinite loop: only reconstruct if currentMatches is empty
    if (currentSession.currentMatches && currentSession.currentMatches.length > 0) return;
    
    // Find active (incomplete) matches for this session
    const activeMatches = matches.filter(match => 
      match && 
      match.session_name === currentSession.name && 
      !match.completed_at && 
      !match.cancelled_at
    );
    
    if (activeMatches.length > 0) {
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
      
      updateSession({
        currentMatches,
        courtStates
      });
    }
  }, [matches, currentSessionId, safeGlobalPlayers, updateSession, currentSession]);

  // Block app if internet connection is required but not available
  if (connectionLoading) {
    return (
      <div className="App">
        <div className="container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
            <div>Connecting...</div>
          </div>
        </div>
        <ConnectionStatus />
      </div>
    );
  }

  if (!isOnline) {
    return <OfflineBlocker error={connectionError} />;
  }

  // Get occupied player IDs from all active sessions
  const occupiedPlayerIds = (safeSessions || []).flatMap(session => {
    if (session.id === currentSessionId) return []; // Don't include current session
    return (session.currentMatches || []).flatMap(match => {
      const playerIds = [
        match.team1?.player1?.id,
        match.team1?.player2?.id,
        match.team2?.player1?.id,
        match.team2?.player2?.id
      ].filter(Boolean);
      return playerIds;
    });
  });

  // Wrapper functions to add notifications
  const handleCompleteMatch = async (courtId, winner) => {
    const result = await completeMatch(courtId, winner);
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleGenerateMatches = () => {
    const result = generateMatches();
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleClearMatches = () => {
    const result = clearMatches();
    showNotification(result.message);
  };

  const handleFillEmptyCourt = async (courtId, matchData) => {
    const result = await fillEmptyCourt(courtId, matchData);
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleAddCourt = () => {
    const result = addCourt();
    showNotification(result.message);
  };

  const handleRemoveCourt = () => {
    const result = removeCourt();
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleSessionSelectWithNotification = (sessionId) => {
    const result = handleSessionSelect(sessionId);
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleSessionCreateWithNotification = (newSession) => {
    const result = handleSessionCreate(newSession);
    showNotification(result.message);
  };

  const handleSessionEndWithNotification = (sessionId) => {
    const result = handleSessionEnd(sessionId);
    showNotification(result.message);
  };

  const handleNavigateHomeWithNotification = () => {
    const result = handleNavigateHome();
    showNotification(result.message);
  };

  const handleAddPlayerToSessionWithNotification = (playerId) => {
    const result = handleAddPlayerToSession(playerId);
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleRemovePlayerFromSessionWithNotification = (playerId) => {
    const result = handleRemovePlayerFromSession(playerId);
    showNotification(result.message);
  };

  const handleCreateNewPlayerWithNotification = (name) => {
    const result = handleCreateNewPlayer(name);
    showNotification(result.message);
  };

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

  // Show welcome page if no current session
  if (!currentSession) {
    return (
      <div className="App">
        <div className="container">
          <header className="app-header">
            <div 
              className="app-title-modern clickable" 
              onClick={handleNavigateHomeWithNotification}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNavigateHomeWithNotification();
                }
              }}
              title="Go to welcome page"
            >
              {/* <div className="app-title-icon">
                <svg width="32" height="32" viewBox="0 0 100 100" fill="none" className="badminton-icon">
                  <circle cx="50" cy="20" r="8" fill="currentColor"/>
                  <path d="M45 28L55 28L52 45L48 45Z" fill="currentColor"/>
                  <ellipse cx="50" cy="60" rx="15" ry="25" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <path d="M35 60L65 60" stroke="currentColor" strokeWidth="1"/>
                  <path d="M40 50L60 50" stroke="currentColor" strokeWidth="1"/>
                  <path d="M40 70L60 70" stroke="currentColor" strokeWidth="1"/>
                  <path d="M45 45L55 45" stroke="currentColor" strokeWidth="1"/>
                  <path d="M45 75L55 75" stroke="currentColor" strokeWidth="1"/>
                </svg>
              </div> */}
              <div className="app-title-content">
                <h1 className="app-title-text">Badminton Pairing</h1>
                <div className="app-title-subtitle">Smart Match Organization</div>
              </div>
            </div>
          </header>
          
          <div className="no-sessions-page">
            <div className="no-sessions-content">
              <div className="welcome-message">
                <h2>Welcome to Badminton Pairing! 🏸</h2>
                {safeSessions.length === 0 ? (
                  <p>Get started by creating your first badminton session. You'll be able to organize matches, track player stats, and manage courts all in one place.</p>
                ) : (
                  <p>Choose an existing session or create a new one to get started.</p>
                )}
              </div>
              
              {/* Show existing sessions if any */}
              {safeSessions.length > 0 && (
                <div className="existing-sessions">
                  <h3>Available Sessions</h3>
                  <div className="sessions-grid">
                    {safeSessions
                      .filter(session => session && (session.isActive !== false && session.is_active !== false))
                      .map(session => (
                        <div 
                          key={session.id} 
                          className="session-card"
                          onClick={() => handleSessionSelectWithNotification(session.id)}
                        >
                          <div className="session-info">
                            <h4 className="session-name">{session.name}</h4>
                            <p className="session-details">
                              Created: {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                            {session.lastActiveAt && (
                              <p className="session-details">
                                Last active: {new Date(session.lastActiveAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="session-arrow">→</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
              
              <div className="create-first-session">
                <CreateFirstSessionButton
                  onSessionCreate={handleSessionCreateWithNotification}
                  existingSessions={safeSessions}
                />
              </div>
            </div>
          </div>
          
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => showNotification(null)}
            />
          )}
        </div>
      </div>
    );
  }

  // Main app interface
  return (
    <div className="App">
      <div className="container">
        <header className="app-header-modern">
          <div 
            className="app-title-modern clickable" 
            onClick={handleNavigateHomeWithNotification}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigateHomeWithNotification();
              }
            }}
            title="Go to welcome page"
          >
            {/* <div className="app-title-icon">
              <svg width="28" height="28" viewBox="0 0 100 100" fill="none" className="badminton-icon">
                <circle cx="50" cy="20" r="8" fill="currentColor"/>
                <path d="M45 28L55 28L52 45L48 45Z" fill="currentColor"/>
                <ellipse cx="50" cy="60" rx="15" ry="25" fill="none" stroke="currentColor" strokeWidth="2"/>
                <path d="M35 60L65 60" stroke="currentColor" strokeWidth="1"/>
                <path d="M40 50L60 50" stroke="currentColor" strokeWidth="1"/>
                <path d="M40 70L60 70" stroke="currentColor" strokeWidth="1"/>
                <path d="M45 45L55 45" stroke="currentColor" strokeWidth="1"/>
                <path d="M45 75L55 75" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </div> */}
            <div className="app-title-content">
              <h1 className="app-title-text">Badminton Pairing</h1>
              <div className="app-title-subtitle">Smart Match Organization</div>
            </div>
          </div>
          
          <SessionOptionsMenu
            currentSession={currentSession}
            onSessionEnd={handleSessionEndWithNotification}
            onUpdateSession={updateSession}
          />
        </header>

        <CurrentMatches
          currentMatches={currentSession.currentMatches || []}
          courtStates={currentSession.courtStates || []}
          courtCount={currentSession.courtCount || 4}
          availablePool={availablePool}
          currentSession={currentSession}
          onCompleteMatch={handleCompleteMatch}
          onFillCourt={handleFillEmptyCourt}
          onAddCourt={handleAddCourt}
          onRemoveCourt={handleRemoveCourt}
          onGenerateMatches={handleGenerateMatches}
          onClearMatches={handleClearMatches}
          onUpdateSession={updateSession}
          isCompletingMatch={isCompletingMatch}
        />

        <SessionPlayerManagement
          globalPlayers={safeGlobalPlayers}
          sessionPlayers={sessionPlayersWithDetails}
          sessionId={currentSessionId}
          occupiedPlayerIds={occupiedPlayerIds}
          onAddPlayerToSession={handleAddPlayerToSessionWithNotification}
          onRemovePlayerFromSession={handleRemovePlayerFromSessionWithNotification}
          onUpdateGlobalPlayer={handleUpdateGlobalPlayer}
          onToggleSessionPlayerActive={handleToggleSessionPlayerActive}
          onCreateNewPlayer={handleCreateNewPlayerWithNotification}
        />

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => showNotification(null)}
          />
        )}

        <Scoreboard players={sessionPlayersWithDetails} />
        
        <ConnectionStatus />
      </div>
    </div>
  );
}

export default RefactoredApp;
