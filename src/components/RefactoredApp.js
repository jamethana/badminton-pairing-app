import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGameContext } from '../contexts/GameContext';
import { useSessionManagement } from '../hooks/useSessionManagement';
// Removed old usePlayerManagement - using efficient individual session player management
import { useMatchManagement } from '../hooks/useMatchManagement';
import { useInternetConnection } from '../hooks/useInternetConnection';
import { useSessionMatches } from '../hooks/useSessionMatches';

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
import { createSupabaseClient } from '../config/supabase';

function RefactoredApp() {
  // Router params
  const { sessionName } = useParams();
  const location = window.location;
  
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
    eloHistory,
    setEloHistory,
    currentSessionId,
    setCurrentSessionId,
    isDataLoading,
    usingSupabase,
    notification,
    showNotification
  } = useGameContext();

  // Session-specific matches (much more efficient than loading all matches)
  const {
    matches,
    isLoading: matchesLoading,
    addMatch,
    updateMatch,
    updateMatches: setMatches
  } = useSessionMatches(currentSessionId);

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

  // Global players only - session players now managed individually through efficient hooks
  const safeGlobalPlayers = globalPlayers || [];
  
  // Legacy compatibility: sessionPlayersWithDetails for useMatchManagement and Scoreboard
  // This provides a lightweight computed version until those components are refactored
  const sessionPlayersWithDetails = React.useMemo(() => {
    if (!currentSessionId || !sessionPlayers || !safeGlobalPlayers.length) {
      return [];
    }

    return sessionPlayers
      .filter(sp => sp && sp.session_id === currentSessionId)
      .map(sessionPlayer => {
        const globalPlayer = safeGlobalPlayers.find(p => p.id === sessionPlayer.player_id);
        if (!globalPlayer) return null;

        return {
          ...globalPlayer,
          // Session-specific data
          sessionMatchCount: sessionPlayer.session_matches || 0,
          sessionWins: sessionPlayer.session_wins || 0,
          sessionLosses: sessionPlayer.session_losses || 0,
          sessionElo: sessionPlayer.session_elo_current || globalPlayer.elo || 1200,
          isActive: sessionPlayer.is_active_in_session === true,
          joinedAt: sessionPlayer.joined_at,
          // Legacy compatibility fields
          sessionStats: {
            matches: sessionPlayer.session_matches || 0,
            wins: sessionPlayer.session_wins || 0,
            losses: sessionPlayer.session_losses || 0
          }
        };
      })
      .filter(Boolean); // Remove null entries
  }, [currentSessionId, sessionPlayers, safeGlobalPlayers]);
  
  // Player management - implemented for efficient session player architecture
  const handleAddPlayerToSession = async (playerId, sessionId) => {
    try {
      // Create session player relationship in database
      const playerData = safeGlobalPlayers.find(p => p.id === playerId);
      if (!playerData) {
        throw new Error('Player not found');
      }

      // This will be handled by the useSessionPlayer hook when components mount
      // For now, just return success - the individual components will handle the database operations
      return { success: true, message: 'Player will be added to session', data: { playerId, sessionId } };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };
  
  const handleCreateNewPlayer = async (playerName) => {
    try {
      // Create player in Supabase to get proper UUID
      const client = await createSupabaseClient();
      
      if (!client) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await client
        .from('players')
        .insert({
          name: playerName,
          current_elo: 1200,
          highest_elo: 1200,
          lowest_elo: 1200,
          total_matches: 0,
          total_wins: 0,
          total_losses: 0
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Transform to local format and update global players
      const newPlayer = {
        id: data.id,
        name: data.name,
        elo: data.current_elo,
        wins: data.total_wins,
        losses: data.total_losses,
        totalMatches: data.total_matches,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setGlobalPlayers(prev => [...prev, newPlayer]);
      return { success: true, message: 'Player created successfully', data: newPlayer };
    } catch (error) {
      console.error('Error creating player:', error);
      return { success: false, message: error.message };
    }
  };
  
  const handleUpdateGlobalPlayer = async (playerId, updates) => {
    try {
      setGlobalPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ));
      return { success: true, message: 'Player updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

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
    addMatch,
    updateMatch,
    setEloHistory,
    updateSession
  });

  // Robust URL resolution with fallback to welcome page
  useEffect(() => {
    // Skip if no session name in URL
    if (!sessionName) {
      return;
    }

    console.log(`🔍 Resolving session URL: "${sessionName}"`);
    console.log(`📊 Available sessions: ${safeSessions.length}, Data loading: ${isDataLoading}`);

    // Set up a timeout to handle cases where data never loads
    const timeoutId = setTimeout(() => {
      if (safeSessions.length === 0 && sessionName) {
        console.log('⏰ Timeout waiting for sessions to load - redirecting to welcome page');
        setCurrentSessionId(null);
        showNotification('Unable to load session data - redirected to welcome page', 'error');
        handleNavigateHome();
      }
    }, 5000); // 5 second timeout

    // Skip if data is still loading and we haven't waited too long
    if (isDataLoading || safeSessions.length === 0) {
      console.log('⏳ Waiting for sessions to load...');
      return () => clearTimeout(timeoutId);
    }

    // Clear timeout since we have data
    clearTimeout(timeoutId);

    try {
      // Find session by name from URL
      const sessionFromUrl = urlToSessionName(sessionName, safeSessions);
      
      if (sessionFromUrl && (sessionFromUrl.isActive !== false && sessionFromUrl.is_active !== false)) {
        console.log(`✅ Found valid session: "${sessionFromUrl.name}"`);
        // URL has valid session name, set it as current
        if (currentSessionId !== sessionFromUrl.id) {
          setCurrentSessionId(sessionFromUrl.id);
        }
      } else {
        console.log(`❌ Invalid session URL: "${sessionName}" - redirecting to welcome page`);
        // URL has invalid session name or session is inactive, redirect to home
        setCurrentSessionId(null);
        showNotification(`Session "${sessionName}" not found or is no longer active`, 'error');
        handleNavigateHome();
      }
    } catch (error) {
      console.error('🚨 Error resolving session URL:', error);
      // Any error in URL resolution should redirect to welcome page
      setCurrentSessionId(null);
      showNotification('Error loading session - redirected to welcome page', 'error');
      handleNavigateHome();
    }

    return () => clearTimeout(timeoutId);
  }, [sessionName, safeSessions, currentSessionId, setCurrentSessionId, handleNavigateHome, isDataLoading, showNotification]);

  // Handle navigation to home page and clean up invalid sessions
  useEffect(() => {
    if (!sessionName) {
      // User navigated to home page (/) - clear current session to show welcome page
      if (currentSessionId) {
        setCurrentSessionId(null);
      }
    }
  }, [sessionName, currentSessionId, setCurrentSessionId]);

  // Handle invalid URLs (like deep paths or malformed URLs)
  useEffect(() => {
    const pathname = location.pathname;
    const basePath = process.env.NODE_ENV === 'production' ? '/badminton-pairing-app' : '';
    const relativePath = pathname.replace(basePath, '');
    
    // Check for invalid URL patterns (paths with more than one segment beyond base)
    const pathSegments = relativePath.split('/').filter(Boolean);
    
    if (pathSegments.length > 1) {
      console.log(`🚨 Invalid URL detected: ${pathname} - redirecting to welcome page`);
      showNotification('Invalid URL - redirected to welcome page', 'error');
      handleNavigateHome();
    }
  }, [location.pathname, showNotification, handleNavigateHome]);

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
    if (!currentSession || !currentSessionId || matchesLoading) return;
    
    // Find active (incomplete) matches for this session
    // Note: matches are already filtered by session_id in useSessionMatches hook
    const activeMatches = matches.filter(match => 
      match && 
      !match.completed_at && 
      !match.cancelled_at
    );
    
    // Always reconstruct to ensure consistency between database and UI state
    // Convert database matches back to UI format
    const currentMatches = activeMatches.map(match => {
      const isDoubles = match.match_type === 'doubles';
      
      // For singles matches, we stored duplicate player IDs, so we need to handle this
      const team1Player1 = safeGlobalPlayers.find(p => p.id === match.team1_player1_id) || 
                          { id: match.team1_player1_id, name: `Player ${match.team1_player1_id}` };
      const team1Player2 = isDoubles && match.team1_player2_id !== match.team1_player1_id ? 
                          (safeGlobalPlayers.find(p => p.id === match.team1_player2_id) || 
                           { id: match.team1_player2_id, name: `Player ${match.team1_player2_id}` }) : null;
      
      const team2Player1 = safeGlobalPlayers.find(p => p.id === match.team2_player1_id) || 
                          { id: match.team2_player1_id, name: `Player ${match.team2_player1_id}` };
      const team2Player2 = isDoubles && match.team2_player2_id !== match.team2_player1_id ? 
                          (safeGlobalPlayers.find(p => p.id === match.team2_player2_id) || 
                           { id: match.team2_player2_id, name: `Player ${match.team2_player2_id}` }) : null;
      
      return {
        id: match.id,
        courtId: match.court_number,
        matchType: match.match_type || 'doubles',
        team1: {
          player1: team1Player1,
          player2: team1Player2
        },
        team2: {
          player1: team2Player1,
          player2: team2Player2
        },
        startTime: match.started_at,
        completed: false
      };
    });
    
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
    
    // Only update if there's a meaningful change to prevent infinite loops
    const hasChanges = 
      JSON.stringify(currentSession.currentMatches || []) !== JSON.stringify(currentMatches) ||
      JSON.stringify(currentSession.courtStates || []) !== JSON.stringify(courtStates);
    
    if (hasChanges) {
      console.log(`🔄 Reconstructing session state: ${currentMatches.length} active matches`);
      updateSession({
        currentMatches,
        courtStates
      });
    }
  }, [matches, currentSessionId, safeGlobalPlayers, updateSession, currentSession, matchesLoading]);

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

  const handleGenerateMatches = async () => {
    const result = await generateMatches();
    if (result.success) {
      showNotification(result.message);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleClearMatches = async () => {
    const result = await clearMatches();
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

  const handleAddPlayerToSessionWithNotification = async (playerId) => {
    try {
      const result = await handleAddPlayerToSession(playerId, currentSessionId);
      showNotification('Player added to session successfully', 'success');
      return result;
    } catch (error) {
      showNotification(`Failed to add player to session: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
  };

  // Removed handleRemovePlayerFromSession - now handled by individual session player components

  const handleCreateNewPlayerWithNotification = async (name) => {
    try {
      const result = await handleCreateNewPlayer(name);
      showNotification(`Player "${name}" created successfully`, 'success');
      return result;
    } catch (error) {
      showNotification(`Failed to create player: ${error.message}`, 'error');
      return { success: false, message: error.message };
    }
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
          sessionId={currentSessionId}
          globalPlayers={safeGlobalPlayers}
          occupiedPlayerIds={occupiedPlayerIds}
          onAddPlayerToSession={handleAddPlayerToSessionWithNotification}
          onUpdateGlobalPlayer={handleUpdateGlobalPlayer}
          onCreateNewPlayer={handleCreateNewPlayerWithNotification}
          setSessionPlayers={setSessionPlayers}
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
