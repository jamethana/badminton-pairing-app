import React, { useState, useEffect } from 'react';
import PlayerCard from './PlayerCard';
import { useSessionPlayers } from '../hooks/usePlayerManagement';
import { getSessionPlayerStats, getELOTier, formatELODisplay } from '../utils/helpers';
import { createSupabaseClient, TABLES } from '../config/supabase';

const SessionPlayerManagement = ({
  sessionId,
  globalPlayers,
  occupiedPlayerIds,
  onAddPlayerToSession,
  onUpdateGlobalPlayer,
  onCreateNewPlayer,
  setSessionPlayers
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [filterText, setFilterText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [addingPlayerId, setAddingPlayerId] = useState(null); // Track which player is being added
  
  const { sessionPlayerIds, isLoading } = useSessionPlayers(sessionId);
  const [localSessionPlayerIds, setLocalSessionPlayerIds] = useState([]);

  // Initialize Supabase client
  useEffect(() => {
    const initClient = async () => {
      const client = await createSupabaseClient();
      setSupabaseClient(client);
    };
    initClient();
  }, []);

  // Sync sessionPlayerIds from hook to local state
  useEffect(() => {
    setLocalSessionPlayerIds(sessionPlayerIds);
  }, [sessionPlayerIds]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  // Create session player relationship directly in Supabase
  const createSessionPlayerRelationship = async (playerId, playerData) => {
    if (!supabaseClient || !sessionId || !playerId) {
      return { success: false, message: 'Missing required data' };
    }

    try {
      const sessionPlayerData = {
        session_id: sessionId,
        player_id: playerId,
        joined_at: new Date().toISOString(),
        session_matches: 0,
        session_wins: 0,
        session_losses: 0,
        session_elo_start: playerData.elo || 1200,
        session_elo_current: playerData.elo || 1200,
        session_elo_peak: playerData.elo || 1200,
        is_active_in_session: true
      };

      const { data, error } = await supabaseClient
        .from(TABLES.SESSION_PLAYERS)
        .insert(sessionPlayerData)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Created session player relationship for ${playerData.name}`);
      return { success: true, message: 'Player added to session', data };
    } catch (error) {
      console.error('Error creating session player relationship:', error);
      return { success: false, message: error.message };
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      // Check if player already exists globally
      const existingPlayer = globalPlayers.find(p => 
        p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
      );
      
      if (existingPlayer) {
        // Check if already in session
        if (localSessionPlayerIds.some(sp => sp.player_id === existingPlayer.id)) {
          alert('Player is already in this session');
          return;
        }
        
        // Check if player is in another active session
        if (occupiedPlayerIds.includes(existingPlayer.id)) {
          alert('Player is currently in another active session');
          return;
        }
        
        // Add existing player to session
        await handleInvitePlayer(existingPlayer.id);
      } else {
        // Create new global player and add to session
        const result = await onCreateNewPlayer(newPlayerName.trim());
        if (result && result.data) {
          await handleInvitePlayerWithData(result.data.id, result.data);
        }
      }
      
      setNewPlayerName('');
      setFilterText('');
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewPlayerName(value);
    setFilterText(value);
  };


  const handleRemovePlayerFromSession = (playerId) => {
    console.log(`📝 Player ${playerId} removed from session ${sessionId}`);
    
    // Optimistic update: immediately remove from local state
    setLocalSessionPlayerIds(prev => prev.filter(sp => sp.player_id !== playerId));
  };

  const handleInvitePlayer = async (playerId) => {
    const playerData = globalPlayers.find(p => p.id === playerId);
    if (playerData) {
      await handleInvitePlayerWithData(playerId, playerData);
    }
  };

  const handleInvitePlayerWithData = async (playerId, playerData) => {
    // Set loading state
    setAddingPlayerId(playerId);
    
    console.log(`📥 Adding player ${playerData.name} to session`);
    const result = await createSessionPlayerRelationship(playerId, playerData);
    
    if (result.success) {
      // Immediately update local state for better UX
      setLocalSessionPlayerIds(prev => [...prev, { 
        player_id: playerId, 
        is_active_in_session: true 
      }]);
      console.log(`✅ Player ${playerData.name} added to local state immediately`);
      
      // Update the global sessionPlayers array for EmptyCourtModal
      if (setSessionPlayers && result.data) {
        setSessionPlayers(prev => [...prev, result.data]);
        console.log(`✅ Player ${playerData.name} added to global sessionPlayers array`);
      }
      
      // Clear loading state after a short delay for visual feedback
      setTimeout(() => {
        setAddingPlayerId(null);
      }, 200);
    } else {
      console.error('Failed to add player to session:', result.message);
      setAddingPlayerId(null);
    }
  };

  // Filter session players by name
  const filteredSessionPlayerIds = localSessionPlayerIds.filter(sp => {
    const globalPlayer = globalPlayers.find(p => p.id === sp.player_id);
    return globalPlayer && globalPlayer.name.toLowerCase().includes(filterText.toLowerCase());
  });

  // Available global players not in this session or other active sessions
  const availableGlobalPlayers = globalPlayers.filter(player =>
    !localSessionPlayerIds.some(sp => sp.player_id === player.id) &&
    !occupiedPlayerIds.includes(player.id) &&
    player.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">Session Players</h2>
        </div>
        <div className="loading-message">Loading session players...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">Session Players</h2>
        <div className="section-actions">
          <button 
            className="btn btn-outline" 
            onClick={() => setShowInviteModal(!showInviteModal)}
            title={showInviteModal ? 'Hide available players list' : 'Show available players from other sessions to invite'}
          >
            {showInviteModal ? 'Hide Available Players' : 'Show Available Players'}
          </button>
        </div>
      </div>

      <form onSubmit={handleAddPlayer} className="add-player-form">
        <div className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder="Add existing player or create new player"
            value={newPlayerName}
            onChange={handleInputChange}
            required
          />
          <button type="submit" className="btn btn-primary">
            Add/Create Player
          </button>
        </div>
      </form>

      {filterText && (
        <div className="filter-info">
          <small style={{ color: 'var(--text-muted)' }}>
            Session: {filteredSessionPlayerIds.length} players
            {availableGlobalPlayers.length > 0 && (
              <span style={{ color: 'var(--primary-color)' }}>
                {' '}• Available: {availableGlobalPlayers.length} players
              </span>
            )}
          </small>
        </div>
      )}

      {/* Session Players */}
      <div className="player-stats-container-compact">
        <div className="player-stats-grid-compact">
          {filteredSessionPlayerIds.map((sessionPlayerInfo) => {
            const globalPlayer = globalPlayers.find(p => p.id === sessionPlayerInfo.player_id);
            if (!globalPlayer) return null;

            return (
              <PlayerCard
                key={`${sessionId}-${sessionPlayerInfo.player_id}`}
                sessionId={sessionId}
                playerId={sessionPlayerInfo.player_id}
                playerName={globalPlayer.name}
                globalPlayerData={globalPlayer}
                onRemove={handleRemovePlayerFromSession}
                getTimeAgo={getTimeAgo}
                disabled={false}
              />
            );
          })}
        </div>
      </div>

      {/* Available Players to Invite */}
      {showInviteModal && (
        <div className="invite-section invite-section-entering">
          <h4>Available Players to Invite:</h4>
          <p className="invite-description">
            These are players from your global database who are not currently in this session or any other active session.
          </p>
          {availableGlobalPlayers.length > 0 ? (
            <div className="invite-players-grid">
            {availableGlobalPlayers.map(player => (
              <div
                key={player.id}
                className={`invite-player-card ${addingPlayerId === player.id ? 'adding' : ''}`}
                onClick={() => !addingPlayerId && handleInvitePlayer(player.id)}
              >
                <span className="player-name">{player.name}</span>
                <span className="player-lifetime-stats">
                  {getELOTier(player.elo || 1200, player).name}
                </span>
                {addingPlayerId === player.id ? (
                  <button className="invite-btn loading">
                    <div className="loading-spinner"></div>
                    Adding...
                  </button>
                ) : (
                  <button className="invite-btn">+ Invite</button>
                )}
              </div>
            ))}
            </div>
          ) : (
            <div className="no-available-players">
              <div className="empty-state-icon">✨</div>
              <p className="empty-state-title">Everyone's playing!</p>
              <p className="empty-state-subtitle">All players are either in this session or actively playing elsewhere</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default SessionPlayerManagement;
