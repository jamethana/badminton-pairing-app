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
  onUpdateSession
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
      <div className="section-header">
        <h2 className="section-title">Current Matches</h2>
        <div className="section-actions">
          <div className="court-management">
            <button className="btn btn-outline" onClick={onRemoveCourt}>
              -
            </button>
            <span className="court-count-display">
              {courtCount} Court{courtCount !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-outline" onClick={onAddCourt}>
              +
            </button>
          </div>
          {/* <button className="btn btn-primary btn-lg" onClick={onGenerateMatches}>
            Generate Matches
          </button> */}
          {/* <button className="btn btn-danger" onClick={handleClearMatches}>
            Clear Matches
          </button> */}
        </div>
      </div>

      <div className="matches-grid grid-2">
        {courtStates.map((court) => (
          <div
            key={court.id}
            className={`match-card ${court.isOccupied ? 'occupied' : 'empty-court'} fade-in`}
            onClick={() => handleCourtClick(court)}
          >
            {court.isOccupied && court.currentMatch ? (
              <div className="match-content">
                <h3>
                  Court {court.id + 1} 
                  <span className="match-type-indicator">
                    {court.currentMatch.matchType === 'singles' ? '(1v1)' : '(2v2)'}
                  </span>
                </h3>
                <div className="teams">
                  <div className="team team1">
                    <div className="player">{court.currentMatch.team1.player1?.name}</div>
                    {court.currentMatch.team1.player2 && (
                      <div className="player">{court.currentMatch.team1.player2.name}</div>
                    )}
                  </div>
                  <div className="vs-divider">VS</div>
                  <div className="team team2">
                    <div className="player">{court.currentMatch.team2.player1?.name}</div>
                    {court.currentMatch.team2.player2 && (
                      <div className="player">{court.currentMatch.team2.player2.name}</div>
                    )}
                  </div>
                </div>
                <div className="match-time">
                  Started: {new Date(court.currentMatch.startTime).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="empty-court-message">
                <h3>Court {court.id + 1}</h3>
                <p>Click to fill with players</p>
                <small>Available: {availablePool.length} players</small>
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