import React from 'react';

const PlayerCard = ({ player, onEdit, onRemove, getTimeAgo, disabled }) => {
  const handleClick = () => {
    if (!disabled) {
      onEdit(player);
    }
  };

  return (
    <div 
      className={`stat-card fade-in clickable ${player.isActive ? '' : 'inactive'} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
    >
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
    </div>
  );
};

export default PlayerCard; 