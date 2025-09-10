import React, { useState } from 'react';
import Modal from './Modal';

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
    <Modal isOpen={true} onClose={onClose} className="court-modal">
      <div className="modal-content select-winner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select Winner - Court {court.id + 1}</h3>
        </div>
        
        <div className="modal-body">
          <div className="winner-selection">
            {/* Team 1 */}
            <button
              className={`team-option team-1-option ${
                selectedWinner === 'team1' ? 'selected' : ''
              }`}
              onClick={() => handleWinnerSelect('team1')}
              disabled={selectedWinner !== null}
            >
              <div className="team-players">
                <div className="player-name">
                  {currentMatch.team1.player1.name}
                </div>
                <div className="player-name">
                  {currentMatch.team1.player2.name}
                </div>
              </div>
            </button>

            {/* Team 2 */}
            <button
              className={`team-option team-2-option ${
                selectedWinner === 'team2' ? 'selected' : ''
              }`}
              onClick={() => handleWinnerSelect('team2')}
              disabled={selectedWinner !== null}
            >
              <div className="team-players">
                <div className="player-name">
                  {currentMatch.team2.player1.name}
                </div>
                <div className="player-name">
                  {currentMatch.team2.player2.name}
                </div>
              </div>
            </button>

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
    </Modal>
  );
};

export default CourtOptionsModal; 