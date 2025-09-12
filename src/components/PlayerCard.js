import React from 'react';
import { useSessionPlayer } from '../hooks/usePlayerManagement';
import { getELOTier, calculateInitialELO, formatELODisplay } from '../utils/helpers';

const PlayerCard = ({ 
  sessionId, 
  playerId, 
  playerName, 
  globalPlayerData,
  onEdit, 
  onRemove,
  getTimeAgo,
  disabled = false 
}) => {
  const { sessionPlayer, isLoading, toggleActive, removeFromSession } = useSessionPlayer(sessionId, playerId);

  if (isLoading) {
    return (
      <div className="session-player-card-compact loading">
        <div className="session-player-main-compact">
          <div className="session-player-avatar-compact loading-avatar">
            <span className="avatar-initial-compact">{playerName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="session-player-info-compact">
            <div className="session-player-header-compact">
              <span className="session-player-name-compact">{playerName}</span>
            </div>
            <div className="session-player-tier-compact">
              <span className="loading-text">Loading...</span>
            </div>
          </div>
          <div className="session-player-stats-compact">
            <span className="stat-text">-M</span>
          </div>
          <div className="session-action-buttons">
            <button className="session-edit-btn-compact" disabled>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="session-move-btn" disabled>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionPlayer) {
    return null; // Player not in session
  }

  const playerELO = sessionPlayer.session_elo_current || globalPlayerData?.elo || calculateInitialELO(0, 0);
  const eloTier = getELOTier(playerELO, globalPlayerData);
  const sessionMatches = sessionPlayer.session_matches || 0;
  const isActive = sessionPlayer.is_active_in_session;

  const handleToggleActive = async (e) => {
    e.stopPropagation();
    if (disabled) return;
    
    console.log(`🎯 Toggling active status for player ${playerName}`);
    const result = await toggleActive();
    if (!result.success) {
      console.error('Failed to toggle active status:', result.message);
    }
  };

  const handleEditName = (e) => {
    e.stopPropagation();
    if (!disabled && onEdit) {
      onEdit({ ...globalPlayerData, id: playerId });
    }
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (disabled) return;
    
    console.log(`🚮 Removing player ${playerName} from session`);
    const result = await removeFromSession();
    if (result.success && onRemove) {
      onRemove(playerId);
    } else {
      console.error('Failed to remove player:', result.message);
    }
  };

  return (
    <div 
      className={`session-player-card-compact ${isActive ? 'active' : 'inactive'} ${disabled ? 'disabled' : ''}`}
      onClick={handleToggleActive}
    >
      <div className="session-player-main-compact">
        <div className="session-player-avatar-compact">
          <span className="avatar-initial-compact">{playerName.charAt(0).toUpperCase()}</span>
        </div>
        
        <div className="session-player-info-compact">
          <div className="session-player-header-compact">
            <span className="session-player-name-compact">{playerName}</span>
          </div>
          
          <div className="session-player-tier-compact">
            <span className="tier-icon-compact" style={{ color: eloTier.color }}>{eloTier.icon}</span>
            <span className="tier-name-compact" style={{ color: eloTier.color }}>{eloTier.name}</span>
          </div>
        </div>

        <div className="session-player-stats-compact">
          <span className="stat-text">{sessionMatches}M</span>
        </div>

        <div className="session-action-buttons">
          <button
            className="session-edit-btn-compact"
            onClick={handleEditName}
            title="Edit player name"
            disabled={disabled}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button
            className="session-move-btn"
            onClick={handleRemove}
            title="Move to available players"
            disabled={disabled}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
