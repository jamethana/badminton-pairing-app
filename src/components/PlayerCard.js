import React, { useState } from 'react';
import { getELOTier, calculateInitialELO, formatELODisplay } from '../utils/helpers';

const PlayerCard = ({ player, onEdit, onRemove, onToggleActive, getTimeAgo, disabled, sessionMode = false }) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  // Use session stats for display
  const playerELO = player.elo || calculateInitialELO(player.wins || 0, player.losses || 0);
  const eloTier = getELOTier(playerELO, player);
  const sessionWins = player.sessionWins || 0;
  const sessionLosses = player.sessionLosses || 0;
  const sessionMatches = player.sessionMatchCount || 0;

  const handleEditName = (e) => {
    e.stopPropagation(); // Prevent card click when editing
    if (!disabled) {
      onEdit(player);
    }
  };

  const handleToggleActive = () => {
    if (!disabled) {
      onToggleActive(player.id, { isActive: !player.isActive });
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
      {/* Header with Name, Edit Icon, and ELO Tier */}
      <div className="stat-header">
        <div className="name-edit-group">
          <span className="stat-name">{player.name}</span>
          <button
            className="player-action-btn edit-btn-icon inline-edit"
            onClick={handleEditName}
            title="Edit player name"
            disabled={disabled}
          >
            ✏️
          </button>
        </div>
        <span className="elo-tier-badge" style={{ color: eloTier.color }}>
          {eloTier.icon} {eloTier.name}
        </span>
      </div>
      
      {/* Stats */}
      <div className="stat-details">
        <small style={{ color: 'var(--success-color)' }}>
          Wins: {sessionWins}
        </small>
        <small style={{ color: 'var(--danger-color)' }}>
          Losses: {sessionLosses}
        </small>
        <small style={{ color: 'var(--text-muted)' }}>
          Matches: {sessionMatches}
        </small>
      </div>
      
      <small style={{ color: 'var(--text-muted)' }}>
        Last match: {player.sessionLastMatchTime ? getTimeAgo(player.sessionLastMatchTime) : 'Never'} | 
        Status: {player.isActive ? 'Active' : 'Inactive'}
      </small>

      {/* Remove Confirmation Message */}
      {showRemoveConfirm && (
        <div className="remove-confirmation">
          <small style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>
            Click again to {sessionMode ? 'remove from session' : 'delete permanently'}
          </small>
        </div>
      )}
    </div>
  );
};

export default PlayerCard; 