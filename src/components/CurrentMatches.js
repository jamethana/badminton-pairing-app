import React, { useState, useEffect } from 'react';
import CourtOptionsModal from './CourtOptionsModal';
import EmptyCourtModal from './EmptyCourtModal';

const CurrentMatches = ({
  currentMatches,
  courtStates,
  courtCount,
  availablePool,
  currentSession,
  onCompleteMatch,
  onFillCourt,
  onAddCourt,
  onRemoveCourt,
  onGenerateMatches,
  onClearMatches,
  onUpdateSession,
  isCompletingMatch
}) => {
  const [showCourtOptions, setShowCourtOptions] = useState(null);
  const [showEmptyCourtModal, setShowEmptyCourtModal] = useState(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update expanded state when modals are open
  useEffect(() => {
    const hasModalOpen = showCourtOptions || showEmptyCourtModal || showClearConfirmation;
    setIsExpanded(hasModalOpen);
    
    // Add/remove expanded class to the component
    const currentMatchesElement = document.querySelector('.CurrentMatches');
    if (currentMatchesElement) {
      if (hasModalOpen) {
        currentMatchesElement.classList.add('expanded');
      } else {
        currentMatchesElement.classList.remove('expanded');
      }
    }
  }, [showCourtOptions, showEmptyCourtModal, showClearConfirmation]);

  const handleCourtClick = (court) => {
    if (court.isOccupied) {
      setShowCourtOptions(court);
    } else {
      setShowEmptyCourtModal(court);
    }
  };

  const handleCompleteMatch = (courtId, winner) => {
    onCompleteMatch(courtId, winner);
    setShowCourtOptions(null);
  };

  const handleFillCourt = (courtId, matchData) => {
    // Pass the match data from the modal to the parent component
    onFillCourt(courtId, matchData);
    setShowEmptyCourtModal(null);
  };

  const handleClearMatches = () => {
    setShowClearConfirmation(true);
  };

  const confirmClearMatches = () => {
    onClearMatches();
    setShowClearConfirmation(false);
  };

  return (
    <div className={`card CurrentMatches ${isExpanded ? 'expanded' : ''}`}>
      <div className="section-header-modern">
        <div className="section-title-group-modern">
          <h2 className="section-title-modern">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="section-icon">
              <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 8h10M7 12h10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Current Matches
          </h2>
          <div className="section-subtitle-modern">
            Manage active courts and ongoing matches
          </div>
        </div>
        <div className="section-actions-modern">
          <div className="court-management-modern">
            <div className="court-controls-modern">
              <button 
                className="court-btn-modern court-btn-remove" 
                onClick={onRemoveCourt}
                title="Remove court"
                aria-label="Remove court"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              
              <div className="court-count-display-modern">
                <div className="court-count-number">{courtCount}</div>
                <div className="court-count-label">Court{courtCount !== 1 ? 's' : ''}</div>
              </div>
              
              <button 
                className="court-btn-modern court-btn-add" 
                onClick={onAddCourt}
                title="Add court"
                aria-label="Add court"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            
          </div>
        </div>
      </div>

      <div className="matches-grid grid-2">
        {courtStates.map((court) => (
          <div
            key={court.id}
            className={`match-card ${court.isOccupied ? 'occupied' : 'empty-court'} fade-in ${isCompletingMatch ? 'completing-match' : ''}`}
            onClick={() => !isCompletingMatch && handleCourtClick(court)}
            style={{ 
              pointerEvents: isCompletingMatch ? 'none' : 'auto',
              opacity: isCompletingMatch ? 0.7 : 1 
            }}
          >
            {court.isOccupied && court.currentMatch ? (
              <div className="match-content-modern">
                {/* Loading overlay for match completion */}
                {isCompletingMatch && (
                  <div className="match-completion-loading">
                    <div className="loading-spinner"></div>
                    <span className="loading-text">Processing match completion...</span>
                  </div>
                )}
                
                {/* Header */}
                <div className="match-header-modern">
                  <div className="court-info-section">
                    <div className="court-badge">Court {court.id + 1}</div>
                    <div className="match-type-badge-modern">
                      {court.currentMatch.matchType === 'singles' ? '🏸 Singles' : '🏸 Doubles'}
                    </div>
                  </div>
                  <div className="match-status-modern">
                    <div className="status-dot"></div>
                    <span className="status-text">Active</span>
                  </div>
                </div>

                {/* Teams */}
                <div className="teams-modern">
                  <div className="team-modern team-1">
                    <div className="team-label">Team 1</div>
                    <div className="players-list-modern">
                      <div className="player-modern">
                        <div className="player-avatar">
                          <span className="avatar-initial">
                            {court.currentMatch.team1.player1?.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="player-name-modern">
                          {court.currentMatch.team1.player1?.name}
                        </span>
                      </div>
                      {court.currentMatch.team1.player2 && (
                        <div className="player-modern">
                          <div className="player-avatar">
                            <span className="avatar-initial">
                              {court.currentMatch.team1.player2.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="player-name-modern">
                            {court.currentMatch.team1.player2.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="vs-divider-modern">
                    {/* <div className="vs-circle">
                      <span className="vs-text">VS</span>
                    </div> */}
                  </div>

                  <div className="team-modern team-2">
                    <div className="team-label">Team 2</div>
                    <div className="players-list-modern">
                      <div className="player-modern">
                        <div className="player-avatar">
                          <span className="avatar-initial">
                            {court.currentMatch.team2.player1?.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="player-name-modern">
                          {court.currentMatch.team2.player1?.name}
                        </span>
                      </div>
                      {court.currentMatch.team2.player2 && (
                        <div className="player-modern">
                          <div className="player-avatar">
                            <span className="avatar-initial">
                              {court.currentMatch.team2.player2.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="player-name-modern">
                            {court.currentMatch.team2.player2.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="match-footer-modern">
                  <div className="match-time-modern">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="time-icon">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>Started {new Date(court.currentMatch.startTime).toLocaleTimeString()}</span>
                  </div>
                  <div className="tap-hint-modern">Tap to complete</div>
                </div>
              </div>
            ) : (
              <div className="empty-court-message">
                <div className="empty-court-icon">🏸</div>
                <h3>Court {court.id + 1}</h3>
                <p className="empty-court-subtitle">Click to assign players</p>
                <div className="available-count">
                  <span className="count-badge">{availablePool.length}</span>
                  <span className="count-label">players available</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCourtOptions && (
        <CourtOptionsModal
          court={showCourtOptions}
          onCompleteMatch={handleCompleteMatch}
          onClose={() => setShowCourtOptions(null)}
          isCompletingMatch={isCompletingMatch}
        />
      )}

      {showEmptyCourtModal && (
        <EmptyCourtModal
          court={showEmptyCourtModal}
          availablePool={availablePool}
          currentSession={currentSession}
          onFillCourt={handleFillCourt}
          onClose={() => setShowEmptyCourtModal(null)}
          onUpdateSession={onUpdateSession}
        />
      )}

      {showClearConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Clear Matches</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to clear all current matches? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowClearConfirmation(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmClearMatches}>
                Clear All Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentMatches; 