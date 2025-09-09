import React, { useState } from 'react';
import { sortPlayersByELO, getELOTier, calculateInitialELO } from '../utils/helpers';

const Scoreboard = ({ players }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Get sorted players with ELO
  const playersWithELO = players.map(player => ({
    ...player,
    elo: player.elo || calculateInitialELO(player.wins, player.losses)
  }));

  const sortedPlayers = sortPlayersByELO(playersWithELO);
  const topPlayers = sortedPlayers.slice(0, 3); // Top 3 for minimized view

  if (isExpanded) {
    return (
      <div className="scoreboard expanded">
        <div className="scoreboard-header">
          <h3>🏆 ELO Rankings</h3>
          <button 
            className="scoreboard-toggle"
            onClick={toggleExpanded}
            title="Minimize scoreboard"
          >
            ✖️
          </button>
        </div>
        <div className="scoreboard-content">
          <div className="ranking-list">
            {sortedPlayers.map((player, index) => {
              const tier = getELOTier(player.elo);
              return (
                <div key={player.id} className="ranking-item">
                  <div className="rank-position">#{index + 1}</div>
                  <div className="player-info">
                    <div className="player-name-row">
                      <span className="player-name">{player.name}</span>
                      <span className="tier-badge" style={{ color: tier.color }}>
                        {tier.icon} {tier.name}
                      </span>
                    </div>
                    <div className="player-stats">
                      <span className="elo-score">ELO: {player.elo}</span>
                      <span className="win-loss">
                        {player.wins || 0}W - {player.losses || 0}L
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
        <h4>🏆 Top 3</h4>
        <button 
          className="scoreboard-toggle"
          title="Expand scoreboard"
        >
          📊
        </button>
      </div>
      <div className="scoreboard-content">
        <div className="top-players">
          {topPlayers.map((player, index) => {
            const tier = getELOTier(player.elo);
            return (
              <div key={player.id} className="top-player-item">
                <span className="mini-rank">#{index + 1}</span>
                <span className="mini-name">{player.name}</span>
                <span className="mini-elo" style={{ color: tier.color }}>
                  {tier.icon} {player.elo}
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
