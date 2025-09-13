import React, { useState } from 'react';
import Modal from './Modal';

const CourtOptionsModal = ({ court, onCompleteMatch, onClose, isCompletingMatch }) => {
  const { currentMatch } = court;
  const [selectedWinner, setSelectedWinner] = useState(null);
  
  if (!currentMatch) return null;

  const handleWinnerSelect = (winner) => {
    if (isCompletingMatch || selectedWinner) return; // Prevent multiple clicks
    
    setSelectedWinner(winner);
    // Small delay to show selection before closing
    setTimeout(() => {
      onCompleteMatch(court.id, winner);
    }, 300);
  };

  return (
    <Modal isOpen={true} onClose={onClose} className="court-modal-modern">
      <div className="court-modal-wrapper-modern" onClick={(e) => e.stopPropagation()}>
        {/* Modern Header */}
        <div className="court-modal-header-modern">
          <div className="court-header-content-modern">
            <div className="court-info-modern">
              <div className="court-badge-modern">Court {court.id + 1}</div>
              <h2 className="court-modal-title-modern">Select Winner</h2>
              <p className="court-modal-subtitle-modern">
                Choose the winning team to complete this match
              </p>
            </div>
            <div className="match-type-indicator-modern">
              {currentMatch.matchType === 'singles' ? '🏸 Singles' : '🏸 Doubles'}
            </div>
          </div>
          <button 
            className="court-modal-close-modern" 
            onClick={onClose}
            disabled={selectedWinner !== null}
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        {/* Loading overlay for match completion */}
        {isCompletingMatch && (
          <div className="modal-completion-loading">
            <div className="loading-spinner"></div>
            <span className="loading-text">Processing match completion...</span>
          </div>
        )}
        
        {/* Modern Body */}
        <div className="court-modal-body-modern">
          <div className="teams-selection-modern">
            {/* Team 1 */}
            <div className="team-card-winner-modern">
              <div className="team-label-modern">Team 1</div>
              <button
                className={`team-winner-btn-modern ${
                  selectedWinner === 'team1' ? 'selected' : ''
                } ${isCompletingMatch ? 'completing' : ''}`}
                onClick={() => handleWinnerSelect('team1')}
                disabled={selectedWinner !== null || isCompletingMatch}
              >
                <div className="team-players-modern">
                  <div className="player-card-winner-modern">
                    <div className="player-avatar-winner-modern">
                      {currentMatch.team1.player1?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="player-name-winner-modern">
                      {currentMatch.team1.player1?.name}
                    </div>
                  </div>
                  {currentMatch.team1.player2 && (
                    <div className="player-card-winner-modern">
                      <div className="player-avatar-winner-modern">
                        {currentMatch.team1.player2.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="player-name-winner-modern">
                        {currentMatch.team1.player2.name}
                      </div>
                    </div>
                  )}
                </div>
                <div className="winner-check-modern">
                  {selectedWinner === 'team1' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {/* VS Divider */}
            <div className="vs-divider-winner-modern">
              {/* <div className="vs-circle-modern">VS</div> */}
            </div>

            {/* Team 2 */}
            <div className="team-card-winner-modern">
              <div className="team-label-modern">Team 2</div>
              <button
                className={`team-winner-btn-modern ${
                  selectedWinner === 'team2' ? 'selected' : ''
                } ${isCompletingMatch ? 'completing' : ''}`}
                onClick={() => handleWinnerSelect('team2')}
                disabled={selectedWinner !== null || isCompletingMatch}
              >
                <div className="team-players-modern">
                  <div className="player-card-winner-modern">
                    <div className="player-avatar-winner-modern">
                      {currentMatch.team2.player1?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="player-name-winner-modern">
                      {currentMatch.team2.player1?.name}
                    </div>
                  </div>
                  {currentMatch.team2.player2 && (
                    <div className="player-card-winner-modern">
                      <div className="player-avatar-winner-modern">
                        {currentMatch.team2.player2.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="player-name-winner-modern">
                        {currentMatch.team2.player2.name}
                      </div>
                    </div>
                  )}
                </div>
                <div className="winner-check-modern">
                  {selectedWinner === 'team2' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Match Actions */}
          <div className="match-actions-modern">
            <button
              className={`cancel-match-btn-modern ${
                selectedWinner === 'cancelled' ? 'selected' : ''
              } ${isCompletingMatch ? 'completing' : ''}`}
              onClick={() => handleWinnerSelect('cancelled')}
              disabled={selectedWinner !== null || isCompletingMatch}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Cancel Match</span>
              {selectedWinner === 'cancelled' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CourtOptionsModal; 