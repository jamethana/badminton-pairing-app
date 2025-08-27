import React, { useState } from 'react';

const PlayerCard = ({ player, onEdit, onRemove, onToggleActive, getTimeAgo, disabled }) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const handleEditName = (e) => {
    e.stopPropagation(); // Prevent card click when editing
    if (!disabled) {
      onEdit(player);
    }
  };

  const handleToggleActive = () => {
    if (!disabled) {
      onToggleActive(player.id, { ...player, isActive: !player.isActive });
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation(); // Prevent card click when removing
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
    <div 
      className={`stat-card fade-in clickable ${player.isActive ? '' : 'inactive'} ${disabled ? 'disabled' : ''}`}
      onClick={handleToggleActive}
    >
      {/* Action Buttons - Top Right */}
      <div className="top-actions">
        <button
          className="player-action-btn edit-btn-icon"
          onClick={handleEditName}
          title="Edit player name"
          disabled={disabled}
        >
          ✏️
        </button>
        <button
          className={`player-action-btn delete-btn-icon ${showRemoveConfirm ? 'confirm' : ''}`}
          onClick={handleRemove}
          title={showRemoveConfirm ? 'Click again to confirm removal' : 'Remove player'}
          disabled={disabled}
        >
          🗑️
        </button>
      </div>

      {/* Header with Name */}
      <div className="stat-header">
        <span className="stat-name">{player.name}</span>
      </div>
      
      {/* Stats */}
      <div className="stat-details">
        <small style={{ color: 'var(--success-color)' }}>
          Wins: {player.wins || 0}
        </small>
        <small style={{ color: 'var(--danger-color)' }}>
          Losses: {player.losses || 0}
        </small>
        <small style={{ color: 'var(--text-muted)' }}>
          Matches: {player.matchCount}
        </small>
      </div>
      
      <small style={{ color: 'var(--text-muted)' }}>
        Last match: {player.lastMatchTime ? getTimeAgo(player.lastMatchTime) : 'Never'} | 
        Status: {player.isActive ? 'Active' : 'Inactive'}
      </small>

      {/* Remove Confirmation Message */}
      {showRemoveConfirm && (
        <div className="remove-confirmation">
          <small style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
            Click delete again to confirm
          </small>
        </div>
      )}
    </div>
  );
};

export default PlayerCard; 