import React, { useState } from 'react';
import Modal from './Modal';
import AdvancedMatchmaking from './AdvancedMatchmaking';

const SessionOptionsMenu = ({ 
  currentSession,
  onSessionEnd,
  onUpdateSession
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowEndConfirm(false);
  };

  const handleEndSession = () => {
    setShowEndConfirm(true);
  };

  const confirmEndSession = () => {
    onSessionEnd(currentSession.id);
    closeMenu();
  };

  if (!currentSession) return null;

  return (
    <>
      {/* Session Options Button */}
      <button 
        className="session-options-btn-modern"
        onClick={toggleMenu}
        title="Session options"
        aria-label="Session options"
      >
        {/* <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="options-icon">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 1v6m0 6v6" stroke="currentColor" strokeWidth="2"/>
          <path d="M21 12h-6m-6 0H3" stroke="currentColor" strokeWidth="2"/>
        </svg> */}
        <span className="session-name-display">Settings</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="dropdown-icon">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Session Options Modal */}
      <Modal isOpen={isMenuOpen} onClose={closeMenu} className="session-options-modal">
        <div className="session-options-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="session-options-header">
            <div className="session-options-title-group">
              <h3 className="session-options-title">Settings</h3>
              <div className="session-options-subtitle">{currentSession.name}</div>
            </div>
            <button className="session-options-close" onClick={closeMenu} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Session Info */}
          <div className="session-info-card">
            <div className="session-info-row">
              <div className="session-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="info-icon">
                  <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 8h10M7 12h10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="info-label">Courts:</span>
                <span className="info-value">{currentSession.courtCount || 4}</span>
              </div>
              <div className="session-info-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="info-icon">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="info-label">Created:</span>
                <span className="info-value">{new Date(currentSession.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Smart Matching Advanced Settings */}
          {onUpdateSession && (
            <div className="smart-matching-section">
              <AdvancedMatchmaking
                session={currentSession}
                onUpdateSettings={(updates) => onUpdateSession(updates)}
              />
            </div>
          )}

          {/* Danger Zone */}
          <div className="danger-zone">
            
            {!showEndConfirm ? (
              <button 
                className="end-session-btn-modern"
                onClick={handleEndSession}
                title="End current session"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="end-icon">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>End Session</span>
              </button>
            ) : (
              <div className="confirm-end-section">
                <div className="confirm-message">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="warning-icon">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div className="confirm-text">
                    <div className="confirm-title">Are you sure?</div>
                    <div className="confirm-subtitle">This will permanently delete the session and all its data.</div>
                  </div>
                </div>
                <div className="confirm-actions">
                  <button 
                    className="confirm-end-btn"
                    onClick={confirmEndSession}
                  >
                    Yes, End Session
                  </button>
                  <button 
                    className="cancel-end-btn"
                    onClick={() => setShowEndConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SessionOptionsMenu;
