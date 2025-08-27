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
      {/* Delete Button - Top Right */}
      <button
        className={`player-action-btn delete-btn ${showRemoveConfirm ? 'confirm' : ''}`}
        onClick={handleRemove}
        title={showRemoveConfirm ? 'Click again to confirm removal' : 'Remove player'}
        disabled={disabled}
      >
        {showRemoveConfirm ? '🗑️' : '🗑️'}
      </button>

      {/* Header with Name and Edit Button */}
      <div className="stat-header">
        <div className="name-edit-container">
          <span className="stat-name">{player.name}</span>
          <button
            className="player-action-btn edit-btn-inline"
            onClick={handleEditName}
            title="Edit player name"
            disabled={disabled}
          >
            Edit
          </button>
        </div>
      </div>
      
      {/* Stats with Match Count */}
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