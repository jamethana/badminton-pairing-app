import React, { useState } from 'react';

const PlayerCard = ({ player, onEdit, onRemove, onToggleActive, getTimeAgo, disabled }) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleEditName = () => {
    if (!disabled) {
      onEdit(player);
    }
  };

  const handleToggleActive = () => {
    if (!disabled) {
      onToggleActive(player.id, { ...player, isActive: !player.isActive });
    }
  };

  const handleRemove = () => {
    if (!disabled) {
      if (showRemoveConfirm) {
        onRemove(player.id);
        setShowRemoveConfirm(false);
      } else {
        setShowRemoveConfirm(true);
        // Auto-hide confirmation after 3 seconds
        setTimeout(() => setShowRemoveConfirm(false), 3000);
      }
    }
  };

  return (
    <div className={`stat-card fade-in ${player.isActive ? '' : 'inactive'} ${disabled ? 'disabled' : ''}`}>
      <div className="stat-header">
        <span className="stat-name">{player.name}</span>
        <span className="stat-value">{player.matchCount}</span>
      </div>
      
      <div className="stat-details">
        <small style={{ color: 'var(--success-color)' }}>
          Wins: {player.wins || 0}
        </small>
        <small style={{ color: 'var(--danger-color)' }}>
          Losses: {player.losses || 0}
        </small>
      </div>
      
      <small style={{ color: 'var(--text-muted)' }}>
        Last match: {player.lastMatchTime ? getTimeAgo(player.lastMatchTime) : 'Never'} | 
        Status: {player.isActive ? 'Active' : 'Inactive'}
      </small>

      {/* Action Buttons */}
      <div className="player-card-actions">
        {/* Edit Name Button */}
        <button
          className="player-action-btn edit-btn"
          onClick={handleEditName}
          title="Edit player name"
          disabled={disabled}
        >
          ✏️
        </button>

        {/* Toggle Active/Inactive Button */}
        <button
          className={`player-action-btn toggle-btn ${player.isActive ? 'active' : 'inactive'}`}
          onClick={handleToggleActive}
          title={`Set ${player.isActive ? 'inactive' : 'active'}`}
          disabled={disabled}
        >
          {player.isActive ? '🟢' : '⚪'}
        </button>

        {/* Remove Player Button */}
        <button
          className={`player-action-btn remove-btn ${showRemoveConfirm ? 'confirm' : ''}`}
          onClick={handleRemove}
          title={showRemoveConfirm ? 'Click again to confirm removal' : 'Remove player'}
          disabled={disabled}
        >
          {showRemoveConfirm ? '❌' : '🗑️'}
        </button>
      </div>

      {/* Remove Confirmation Message */}
      {showRemoveConfirm && (
        <div className="remove-confirmation">
          <small style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
            Click remove again to confirm
          </small>
        </div>
      )}
    </div>
  );
};

export default PlayerCard; 