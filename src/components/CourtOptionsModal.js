import React, { useState } from 'react';

const CourtOptionsModal = ({ court, onCompleteMatch, onClose }) => {
  const { currentMatch } = court;
  const [selectedWinner, setSelectedWinner] = useState(null);
  
  if (!currentMatch) return null;

  const handleWinnerSelect = (winner) => {
    setSelectedWinner(winner);
    // Small delay to show selection before closing
    setTimeout(() => {
      onCompleteMatch(court.id, winner);
    }, 300);
  };

  const getTeamStats = (team) => {
    const player1Wins = team.player1.wins || 0;
    const player1Losses = team.player1.losses || 0;
    const player2Wins = team.player2.wins || 0;
    const player2Losses = team.player2.losses || 0;
    
    return {
      totalWins: player1Wins + player2Wins,
      totalLosses: player1Losses + player2Losses,
      winRate: player1Wins + player2Wins + player1Losses + player2Losses > 0 
        ? Math.round(((player1Wins + player2Wins) / (player1Wins + player2Wins + player1Losses + player2Losses)) * 100)
        : 0
    };
  };

  const team1Stats = getTeamStats(currentMatch.team1);
  const team2Stats = getTeamStats(currentMatch.team2);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content select-winner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Match Complete - Court {court.id + 1}</h3>
          <p className="modal-subtitle">Select the winning team to record the match result</p>
        </div>
        
        <div className="modal-body">
          {/* Match Summary */}
          <div className="match-summary">
            <div className="match-header">
              <h4 className="match-title">Match Summary</h4>
              <div className="match-time">
                Started: {new Date(currentMatch.startTime).toLocaleTimeString()}
              </div>
            </div>
            
            {/* Team 1 */}
            <div className="team-option team-1-option">
              <div className="team-header">
                <div className="team-info">
                  <h5 className="team-name">Team 1</h5>
                  <div className="team-color-indicator team-1-color"></div>
                </div>
                <div className="team-stats">
                  <span className="stat-item">
                    <span className="stat-label">Wins:</span>
                    <span className="stat-value">{team1Stats.totalWins}</span>
                  </span>
                  <span className="stat-item">
                    <span className="stat-label">Win Rate:</span>
                    <span className="stat-value">{team1Stats.winRate}%</span>
                  </span>
                </div>
              </div>
              
              <div className="team-players">
                <div className="player-info">
                  <span className="player-name">{currentMatch.team1.player1.name}</span>
                  <span className="player-stats">
                    {currentMatch.team1.player1.wins || 0}W - {currentMatch.team1.player1.losses || 0}L
                  </span>
                </div>
                <div className="player-info">
                  <span className="player-name">{currentMatch.team1.player2.name}</span>
                  <span className="player-stats">
                    {currentMatch.team1.player2.wins || 0}W - {currentMatch.team1.player2.losses || 0}L
                  </span>
                </div>
              </div>
              
              <button
                className={`winner-select-btn team-1-btn ${
                  selectedWinner === 'team1' ? 'selected' : ''
                }`}
                onClick={() => handleWinnerSelect('team1')}
                disabled={selectedWinner !== null}
              >
                <span className="btn-icon">🏆</span>
                <span className="btn-text">Team 1 Won</span>
                <span className="btn-hint">Click to select winner</span>
              </button>
            </div>

            {/* VS Divider */}
            <div className="vs-divider">
              <div className="vs-line"></div>
              <span className="vs-text">VS</span>
              <div className="vs-line"></div>
            </div>

            {/* Team 2 */}
            <div className="team-option team-2-option">
              <div className="team-header">
                <div className="team-info">
                  <h5 className="team-name">Team 2</h5>
                  <div className="team-color-indicator team-2-color"></div>
                </div>
                <div className="team-stats">
                  <span className="stat-item">
                    <span className="stat-label">Wins:</span>
                    <span className="stat-value">{team2Stats.totalWins}</span>
                  </span>
                  <span className="stat-item">
                    <span className="stat-label">Win Rate:</span>
                    <span className="stat-value">{team2Stats.winRate}%</span>
                  </span>
                </div>
              </div>
              
              <div className="team-players">
                <div className="player-info">
                  <span className="player-name">{currentMatch.team2.player1.name}</span>
                  <span className="player-stats">
                    {currentMatch.team2.player1.wins || 0}W - {currentMatch.team2.player2.losses || 0}L
                  </span>
                </div>
                <div className="player-info">
                  <span className="player-name">{currentMatch.team2.player2.name}</span>
                  <span className="player-stats">
                    {currentMatch.team2.player2.wins || 0}W - {currentMatch.team2.player2.losses || 0}L
                  </span>
                </div>
              </div>
              
              <button
                className={`winner-select-btn team-2-btn ${
                  selectedWinner === 'team2' ? 'selected' : ''
                }`}
                onClick={() => handleWinnerSelect('team2')}
                disabled={selectedWinner !== null}
              >
                <span className="btn-icon">🏆</span>
                <span className="btn-text">Team 2 Won</span>
                <span className="btn-hint">Click to select winner</span>
              </button>
            </div>

            {/* Cancel Match Option */}
            <div className="cancel-match-section">
              <div className="cancel-header">
                <h5 className="cancel-title">Other Options</h5>
              </div>
              
              <button
                className={`winner-select-btn cancel-btn ${
                  selectedWinner === 'cancelled' ? 'selected' : ''
                }`}
                onClick={() => handleWinnerSelect('cancelled')}
                disabled={selectedWinner !== null}
              >
                <span className="btn-icon">❌</span>
                <span className="btn-text">Cancel Match</span>
                <span className="btn-hint">Match won't count towards stats</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-outline" 
            onClick={onClose}
            disabled={selectedWinner !== null}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourtOptionsModal; 