import React, { useState } from 'react';
import { useSessionPlayer } from '../hooks/usePlayerManagement';
import { getELOTier, calculateInitialELO, formatELODisplay } from '../utils/helpers';

const PlayerCard = ({ 
  sessionId, 
  playerId, 
  playerName, 
  globalPlayerData,
  onRemove,
  getTimeAgo,
  disabled = false 
}) => {
  const { sessionPlayer, isLoading, toggleActive, removeFromSession } = useSessionPlayer(sessionId, playerId);
  const [isRemoving, setIsRemoving] = useState(false);

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


  const handleMoveToAvailable = async (e) => {
    e.stopPropagation();
    if (disabled || isRemoving) return;
    
    // Start removal animation
    setIsRemoving(true);
    console.log(`📤 Moving player ${playerName} to available players section`);
    
    // Actually remove the session player record from database
    if (!sessionId || !playerId) {
      console.error('Missing sessionId or playerId');
      setIsRemoving(false);
      return;
    }

    try {
      // Import Supabase client locally for this specific operation
      const { createSupabaseClient, TABLES } = await import('../config/supabase');
      const supabaseClient = await createSupabaseClient();
      
      if (!supabaseClient) {
        console.error('Failed to get Supabase client');
        setIsRemoving(false);
        return;
      }

      // Wait for animation to start
      await new Promise(resolve => setTimeout(resolve, 150));

      // Delete the session player record completely
      const { error } = await supabaseClient
        .from(TABLES.SESSION_PLAYERS)
        .delete()
        .eq('session_id', sessionId)
        .eq('player_id', playerId);

      if (error) throw error;

      console.log(`✅ Successfully moved player ${playerName} to available players`);
      
      // Call the parent's onRemove callback for immediate UI update
      if (onRemove) {
        onRemove(playerId);
      }
      
    } catch (error) {
      console.error('Failed to move player to available section:', error);
      setIsRemoving(false);
    }
  };

  return (
    <div 
      className={`session-player-card-compact ${isActive ? 'active' : 'inactive'} ${disabled ? 'disabled' : ''} ${isRemoving ? 'removing' : ''}`}
      onClick={handleToggleActive}
    >
      <div className="session-player-main-compact flex-between gap-3">
        <div className="session-player-avatar-compact flex-center">
          <span className="avatar-initial-compact font-semibold">{playerName.charAt(0).toUpperCase()}</span>
        </div>
        
        <div className="session-player-info-compact flex-1">
          <div className="session-player-header-compact">
            <span className="session-player-name-compact font-medium">{playerName}</span>
          </div>
          
          <div className="session-player-tier-compact flex gap-1">
            <span className="tier-icon-compact" style={{ color: eloTier.color }}>{eloTier.icon}</span>
            <span className="tier-name-compact text-sm" style={{ color: eloTier.color }}>{eloTier.name}</span>
          </div>
        </div>

        <div className="session-player-stats-compact text-center">
          <span className="stat-text text-sm font-medium">{sessionMatches}M</span>
        </div>

        <div className="session-action-buttons">
          <button
            className={`session-move-btn btn-reset ${isRemoving ? 'removing' : ''}`}
            onClick={handleMoveToAvailable}
            title={isRemoving ? "Moving player..." : "Move to available players"}
            disabled={disabled || isRemoving}
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
