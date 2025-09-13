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
  
  // Animation state management
  const [animatingCourts, setAnimatingCourts] = useState(new Set());
  const [completedAnimations, setCompletedAnimations] = useState(new Set());
  const [removingCourtId, setRemovingCourtId] = useState(null);
  const [previousCourtCount, setPreviousCourtCount] = useState(courtCount);
  const [courtStatesWithRemoving, setCourtStatesWithRemoving] = useState(courtStates);

  // Handle court count changes and animations
  useEffect(() => {
    if (courtCount !== previousCourtCount) {
      if (courtCount > previousCourtCount) {
        // Court added - animate the new court
        const newCourtId = courtCount - 1; // Last court index
        setAnimatingCourts(prev => new Set([...prev, newCourtId]));
        setCourtStatesWithRemoving(courtStates); // Update display states
        
        // Don't remove animation class - let CSS forwards fill-mode maintain final state
        // Just clean up will-change for performance after animation completes
        setTimeout(() => {
          setCompletedAnimations(prev => new Set([...prev, newCourtId]));
        }, 350); // Match animation duration
        
      } else if (courtCount < previousCourtCount) {
        // Court being removed - animate the removal BEFORE updating court states
        const removedCourtId = previousCourtCount - 1; // Last court that will be removed
        setRemovingCourtId(removedCourtId);
        
        // Keep the old court states for animation, then update after animation completes
        setTimeout(() => {
          setRemovingCourtId(null);
          setCourtStatesWithRemoving(courtStates); // Update to new states after animation
        }, 250); // Match modern courtSlideOut animation duration
      } else {
        // No count change, just update states
        setCourtStatesWithRemoving(courtStates);
      }
      
      setPreviousCourtCount(courtCount);
    } else {
      // Update court states when no count change (e.g., match completion)
      setCourtStatesWithRemoving(courtStates);
    }
  }, [courtCount, previousCourtCount, courtStates]);

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
      <div className="section-header-modern flex-between mb-6">
        <div className="section-title-group-modern">
          <h2 className="section-title-modern flex gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="section-icon">
              <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 8h10M7 12h10" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Current Matches
          </h2>
          <div className="section-subtitle-modern text-sm">
            Manage active courts and ongoing matches
          </div>
        </div>
        <div className="section-actions-modern">
          <div className="court-management-modern flex gap-2">
            <div className="court-controls-modern flex gap-2">
              <button 
                className="court-btn-modern court-btn-remove btn-reset" 
                onClick={onRemoveCourt}
                title="Remove court"
                aria-label="Remove court"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              
              <div className="court-count-display-modern flex-column-center p-2 rounded">
                <div className="court-count-number font-bold">{courtCount}</div>
                <div className="court-count-label text-sm">Court{courtCount !== 1 ? 's' : ''}</div>
              </div>
              
              <button 
                className="court-btn-modern court-btn-add btn-reset" 
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

      <div className={`matches-grid grid-2 ${animatingCourts.size > 0 || removingCourtId !== null ? 'courts-animating' : ''}`}>
        {courtStatesWithRemoving.map((court) => {
          // Determine animation classes
          const isAnimatingIn = animatingCourts.has(court.id);
          const isAnimatingOut = removingCourtId === court.id;
          const isCompleted = completedAnimations.has(court.id);
          
          let animationClass = 'fade-in';
          if (isAnimatingIn) {
            animationClass = 'court-adding';
          } else if (isAnimatingOut) {
            animationClass = 'court-removing';
          } else if (isCompleted) {
            animationClass = 'court-animation-complete';
          }
          
          return (
            <div
              key={court.id}
              className={`match-card flex-column ${court.isOccupied ? 'occupied' : 'empty-court'} ${animationClass} ${isCompletingMatch ? 'completing-match' : ''}`}
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
                  <div className="match-completion-loading flex-column-center gap-3">
                    <div className="loading-spinner"></div>
                    <span className="loading-text text-sm">Processing match completion...</span>
                  </div>
                )}
                
                {/* Header */}
                <div className="match-header-modern flex-between mb-4">
                  <div className="court-info-section flex gap-2">
                    <div className="badge badge-primary">Court {court.id + 1}</div>
                    <div className="badge badge-secondary">
                      {court.currentMatch.matchType === 'singles' ? '🏸 Singles' : '🏸 Doubles'}
                    </div>
                  </div>
                  <div className="match-status-modern flex gap-1">
                    <div className="status-indicator"></div>
                    <span className="status-text text-sm">Active</span>
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
          );
        })}
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