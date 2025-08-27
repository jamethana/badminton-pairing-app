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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content select-winner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select Winner - Court {court.id + 1}</h3>
        </div>
        
        <div className="modal-body">
          <div className="winner-selection">
            {/* Team 1 */}
            <div className="team-option team-1-option">
              <div className="team-name">Team 1</div>
              <div className="team-players">
                {currentMatch.team1.player1.name} & {currentMatch.team1.player2.name}
              </div>
              <button
                className={`winner-select-btn team-1-btn ${
                  selectedWinner === 'team1' ? 'selected' : ''
                }`}
                onClick={() => handleWinnerSelect('team1')}
                disabled={selectedWinner !== null}
              >
                Team 1 Won
              </button>
            </div>

            {/* VS Divider */}
            <div className="vs-divider">
              <span className="vs-text">VS</span>
            </div>

            {/* Team 2 */}
            <div className="team-option team-2-option">
              <div className="team-name">Team 2</div>
              <div className="team-players">
                {currentMatch.team2.player1.name} & {currentMatch.team2.player2.name}
              </div>
              <button
                className={`winner-select-btn team-2-btn ${
                  selectedWinner === 'team2' ? 'selected' : ''
                }`}
                onClick={() => handleWinnerSelect('team2')}
                disabled={selectedWinner !== null}
              >
                Team 2 Won
              </button>
            </div>

            {/* Cancel Match Option */}
            <div className="cancel-match-section">
              <button
                className={`winner-select-btn cancel-btn ${
                  selectedWinner === 'cancelled' ? 'selected' : ''
                }`}
                onClick={() => handleWinnerSelect('cancelled')}
                disabled={selectedWinner !== null}
              >
                Cancel Match
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