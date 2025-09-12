import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import PlayerEditModal from './PlayerEditModal';
import { getSessionPlayerStats, getELOTier, formatELODisplay } from '../utils/helpers';

const SessionPlayerManagement = ({
  globalPlayers,
  sessionPlayers,
  sessionId,
  occupiedPlayerIds,
  onAddPlayerToSession,
  onRemovePlayerFromSession,
  onUpdateGlobalPlayer,
  onToggleSessionPlayerActive,
  onCreateNewPlayer
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [animatingPlayers, setAnimatingPlayers] = useState(new Set()); // Track animating players
  const [removingPlayers, setRemovingPlayers] = useState(new Set()); // Track players being removed
  const [inviteAnimatingPlayers, setInviteAnimatingPlayers] = useState(new Set()); // Track invite section animations

  // Animation helper for adding players
  const animatePlayerAdd = (playerId, callback) => {
    setAnimatingPlayers(prev => new Set(prev).add(playerId));
    
    // Execute add after brief delay for animation
    setTimeout(() => {
      callback();
      // Remove from animating after animation completes
      setTimeout(() => {
        setAnimatingPlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
      }, 300); // Match CSS animation duration
    }, 50);
  };

  // Animation helper for removing players
  const animatePlayerRemove = (playerId, callback) => {
    setRemovingPlayers(prev => new Set(prev).add(playerId));
    
    // Execute remove after animation
    setTimeout(() => {
      callback();
      setRemovingPlayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
    }, 250); // Allow time for exit animation
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      // Check if player already exists globally
      const existingPlayer = globalPlayers.find(p => 
        p.name.toLowerCase() === newPlayerName.trim().toLowerCase()
      );
      
      if (existingPlayer) {
        // Check if already in session
        if (sessionPlayers.some(sp => sp.id === existingPlayer.id)) {
          alert('Player is already in this session');
          return;
        }
        
        // Check if player is in another active session
        if (occupiedPlayerIds.includes(existingPlayer.id)) {
          alert('Player is currently in another active session');
          return;
        }
        
        // Add existing player to session with animation
        animatePlayerAdd(existingPlayer.id, () => {
          onAddPlayerToSession(existingPlayer.id);
        });
      } else {
        // Create new global player and add to session
        onCreateNewPlayer(newPlayerName.trim());
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

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
  };

  const handleUpdatePlayer = (id, updates) => {
    onUpdateGlobalPlayer(id, updates);
    setEditingPlayer(null);
  };

  const handleRemovePlayerFromSession = (playerId) => {
    animatePlayerRemove(playerId, () => {
      onRemovePlayerFromSession(playerId);
    });
  };

  const handleToggleActive = (id, updatedPlayer) => {
    // Use the dedicated session player toggle function
    if (onToggleSessionPlayerActive) {
      onToggleSessionPlayerActive(id, updatedPlayer.isActive);
    }
  };

  const handleInvitePlayer = (playerId) => {
    // Animate the invite card disappearing
    setInviteAnimatingPlayers(prev => new Set(prev).add(playerId));
    
    // Start the session player add animation
    animatePlayerAdd(playerId, () => {
      onAddPlayerToSession(playerId);
      
      // Clean up invite animation state after invite section updates
      setTimeout(() => {
        setInviteAnimatingPlayers(prev => {
          const newSet = new Set(prev);
          newSet.delete(playerId);
          return newSet;
        });
      }, 300);
    });
  };

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

  // Filter session players
  const filteredPlayers = sessionPlayers.filter(player =>
    player.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Available global players not in this session or other active sessions
  const availableGlobalPlayers = globalPlayers.filter(player =>
    !sessionPlayers.some(sp => sp.id === player.id) &&
    !occupiedPlayerIds.includes(player.id) &&
    player.name.toLowerCase().includes(filterText.toLowerCase())
  );

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
            Session: {filteredPlayers.length} players
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
          {filteredPlayers.map((player) => (
            <div
              key={player.id}
              className={`${
                animatingPlayers.has(player.id) ? 'player-entering' : ''
              } ${
                removingPlayers.has(player.id) ? 'player-exiting' : ''
              }`}
            >
              <PlayerCard
                player={player}
                onEdit={handleEditPlayer}
                onRemove={handleRemovePlayerFromSession}
                onToggleActive={handleToggleActive}
                getTimeAgo={getTimeAgo}
                disabled={false}
                sessionMode={true}
              />
            </div>
          ))}
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
                className={`invite-player-card ${
                  inviteAnimatingPlayers.has(player.id) ? 'player-exiting' : ''
                }`}
                onClick={() => handleInvitePlayer(player.id)}
              >
                <span className="player-name">{player.name}</span>
                <span className="player-lifetime-stats">
                  {/* Lifetime: {player.wins || 0}W - {player.losses || 0}L  */}
                  {getELOTier(player.elo || 1200, player).name}
                </span>
                <button className="invite-btn">+ Invite</button>
              </div>
            ))}
            </div>
          ) : (
            <p className="no-available-players">
              No available players to invite. All global players are either in this session or in other active sessions.
            </p>
          )}
        </div>
      )}

      {editingPlayer && (
        <PlayerEditModal
          playerId={editingPlayer.id}
          playerName={editingPlayer.name}
          onSave={handleUpdatePlayer}
          onRemove={() => {}} // Don't allow removal from global through session
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </div>
  );
};

export default SessionPlayerManagement;
