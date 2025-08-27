import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import PlayerEditModal from './PlayerEditModal';

const PlayerManagement = ({
  players,
  isAddingPlayer,
  onAddPlayer,
  onUpdatePlayer,
  onRemovePlayer,
  onResetMatchCounts
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handleEditPlayer = (player) => {
    console.log('Opening edit modal for player:', player);
    
    // Find the current player from the players array to ensure we have the latest data
    const currentPlayer = players.find(p => p.id === player.id);
    if (currentPlayer) {
      console.log('Found current player data:', currentPlayer);
      setEditingPlayer(currentPlayer);
    } else {
      console.error('Player not found in current state, cannot open edit modal');
      // Don't open the modal if we can't find the player
    }
  };

  const handleUpdatePlayer = (id, updates) => {
    onUpdatePlayer(id, updates);
    setEditingPlayer(null);
  };

  const handleRemovePlayer = (id) => {
    onRemovePlayer(id);
    setEditingPlayer(null);
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

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">Player Management</h2>
        <div className="section-actions">
          <button className="btn btn-warning" onClick={onResetMatchCounts}>
            Reset All Match Counts
          </button>
        </div>
      </div>

      <form onSubmit={handleAddPlayer} className="add-player-form">
        <div className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder="Enter player name"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            Add Player
          </button>
        </div>
      </form>

      <div className="player-stats-container-compact">
        <div className="player-stats-grid-compact">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={handleEditPlayer}
              onRemove={handleRemovePlayer}
              getTimeAgo={getTimeAgo}
              disabled={isAddingPlayer}
            />
          ))}
        </div>
      </div>

      {editingPlayer && (
        <PlayerEditModal
          playerId={editingPlayer.id}
          player={editingPlayer}
          onUpdate={handleUpdatePlayer}
          onRemove={handleRemovePlayer}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </div>
  );
};

export default PlayerManagement; 