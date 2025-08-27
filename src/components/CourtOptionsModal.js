import React from 'react';

const CourtOptionsModal = ({ court, onCompleteMatch, onClose }) => {
  const { currentMatch } = court;
  
  if (!currentMatch) return null;

  const handleWinnerSelect = (winner) => {
    onCompleteMatch(court.id, winner);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Select Winner - Court {court.id + 1}</h3>
        </div>
        
        <div className="modal-body">
          <div className="court-options-content">
            <h3>Who won this match?</h3>
            
            <div className="court-options-buttons">
              <button
                className="btn btn-success court-option-btn"
                onClick={() => handleWinnerSelect('team1')}
              >
                <strong>{currentMatch.team1.player1.name} & {currentMatch.team1.player2.name}</strong>
                <small>Team 1</small>
              </button>
              
              <button
                className="btn btn-success court-option-btn"
                onClick={() => handleWinnerSelect('team2')}
              >
                <strong>{currentMatch.team2.player1.name} & {currentMatch.team2.player2.name}</strong>
                <small>Team 2</small>
              </button>
              
              <button
                className="btn btn-warning court-option-btn"
                onClick={() => handleWinnerSelect('cancelled')}
              >
                <strong>Cancel Match</strong>
                <small>Match won't count</small>
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourtOptionsModal; 