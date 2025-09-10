import React, { useState } from 'react';
import { sortPlayersByELO, sortPlayersByWins, getELOTier, calculateInitialELO } from '../utils/helpers';

const Scoreboard = ({ players }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState('session'); // 'session' or 'lifetime'

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'session' ? 'lifetime' : 'session');
  };

  // Get sorted players with appropriate stats based on view mode
  const playersWithStats = players.map(player => {
    if (viewMode === 'session') {
      return {
        ...player,
        displayWins: player.sessionWins || 0,
        displayLosses: player.sessionLosses || 0,
        displayMatches: player.sessionMatchCount || 0
      };
    } else {
      return {
        ...player,
        displayElo: player.elo || calculateInitialELO(player.wins || 0, player.losses || 0),
        displayWins: player.wins || 0,
        displayLosses: player.losses || 0,
        displayMatches: player.matchCount || 0
      };
    }
  });

  // Sort players based on view mode
  const sortedPlayers = viewMode === 'session' 
    ? sortPlayersByWins(playersWithStats)
    : sortPlayersByELO(playersWithStats, false);
  const topPlayers = sortedPlayers.slice(0, 3); // Top 3 for minimized view

  if (isExpanded) {
    return (
      <div className="scoreboard expanded">
        <div className="scoreboard-header">
          <h3>🏆 {viewMode === 'session' ? 'Session' : 'Lifetime'} Rankings</h3>
          <div className="header-controls">
            <button 
              className="view-mode-toggle"
              onClick={toggleViewMode}
              title={`Switch to ${viewMode === 'session' ? 'lifetime' : 'session'} view`}
            >
              {viewMode === 'session' ? '📊' : '⏱️'}
            </button>
            <button 
              className="scoreboard-toggle"
              onClick={toggleExpanded}
              title="Minimize scoreboard"
            >
              ✖️
            </button>
          </div>
        </div>
        <div className="scoreboard-content">
          <div className="ranking-list">
            {sortedPlayers.map((player, index) => {
              return (
                <div key={player.id} className="ranking-item">
                  <div className="rank-position">#{index + 1}</div>
                  <div className="player-info">
                    <div className="player-name-row">
                      <span className="player-name">{player.name}</span>
                      {viewMode === 'lifetime' && (
                        <span className="tier-badge" style={{ color: getELOTier(player.displayElo).color }}>
                          {getELOTier(player.displayElo).icon} {getELOTier(player.displayElo).name}
                        </span>
                      )}
                    </div>
                    <div className="player-stats">
                      {viewMode === 'lifetime' && (
                        <span className="elo-score">ELO: {player.displayElo}</span>
                      )}
                      <span className="win-loss">
                        {player.displayWins}W - {player.displayLosses}L
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scoreboard minimized">
      <div className="scoreboard-header" onClick={toggleExpanded}>
        <h4>🏆 {viewMode === 'session' ? 'Session' : 'Lifetime'}</h4>
        <div className="header-controls">
          <button 
            className="view-mode-toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleViewMode();
            }}
            title={`Switch to ${viewMode === 'session' ? 'lifetime' : 'session'} view`}
          >
            {viewMode === 'session' ? '📊' : '⏱️'}
          </button>
          <button 
            className="scoreboard-toggle"
            title="Expand scoreboard"
          >
            ⛶
          </button>
        </div>
      </div>
      <div className="scoreboard-content">
        <div className="top-players">
          {topPlayers.map((player, index) => {
            return (
              <div key={player.id} className="top-player-item">
                <span className="mini-rank">#{index + 1}</span>
                <span className="mini-name">{player.name}</span>
                <span className="mini-elo">
                  {viewMode === 'session' 
                    ? `${player.displayWins}W`
                    : (() => {
                        const tier = getELOTier(player.displayElo);
                        return (
                          <span style={{ color: tier.color }}>
                            {tier.icon} {player.displayElo}
                          </span>
                        );
                      })()
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
