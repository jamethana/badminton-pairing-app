import React, { useState } from 'react';
import Modal from './Modal';
import { createNewSession } from '../utils/helpers';

const SessionHamburgerMenu = ({ 
  sessions, 
  currentSessionId, 
  onSessionSelect, 
  onSessionCreate, 
  onSessionEnd
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsCreating(false);
    setNewSessionName('');
  };

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      const newSession = createNewSession(newSessionName);
      onSessionCreate(newSession);
      setNewSessionName('');
      setIsCreating(false);
      closeMenu();
    }
  };

  const handleSessionSelect = (sessionId) => {
    onSessionSelect(sessionId);
    closeMenu();
  };

  const handleEndSession = (sessionId = null) => {
    const targetSession = sessionId ? sessions.find(s => s.id === sessionId) : currentSession;
    
    if (targetSession && window.confirm(`Are you sure you want to end session "${targetSession.name}"? This will permanently delete the session and all its data.`)) {
      onSessionEnd(sessionId || currentSessionId);
      closeMenu();
    }
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        className="hamburger-menu-btn"
        onClick={toggleMenu}
        title="Session Menu"
      >
        <div className="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="session-info-mini">
          <span className="current-session-name">{currentSession?.name || 'No Session'}</span>
          <span className="session-player-count">{currentSession?.playerIds?.length || 0} players</span>
        </div>
      </button>

      {/* Session Menu Modal */}
      <Modal isOpen={isMenuOpen} onClose={closeMenu} className="session-menu-modal">
        <div className="session-menu-content" onClick={(e) => e.stopPropagation()}>
          <div className="menu-header">
            <h3>🎯 Sessions</h3>
            <button className="close-btn" onClick={closeMenu}>✖️</button>
          </div>

          {currentSession && (
            <div className="current-session-info">
              <h4>Current Session</h4>
              <div className="current-session-card">
                <div className="session-card-info">
                  <span className="session-name">{currentSession.name}</span>
                  <span className="session-details">
                    {currentSession.playerIds?.length || 0} players • {currentSession.courtCount || 4} courts
                  </span>
                  <span className="session-created">
                    Created: {new Date(currentSession.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  className="btn btn-outline btn-sm end-session-btn"
                  onClick={() => handleEndSession()}
                  title="End current session (permanently delete)"
                >
                  End Session
                </button>
              </div>
            </div>
          )}

          {/* Create New Session */}
          <div className="create-session-section">
            {!isCreating ? (
              <button 
                className="btn btn-primary btn-full"
                onClick={() => setIsCreating(true)}
              >
                + Create New Session
              </button>
            ) : (
              <form onSubmit={handleCreateSession} className="create-form">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter session name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  required
                  autoFocus
                />
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Create</button>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => setIsCreating(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Session List */}
          {sessions.length > 1 && (
            <div className="session-list-section">
              <h4>Switch Session</h4>
              <div className="session-list">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                    onClick={() => handleSessionSelect(session.id)}
                  >
                    <div className="session-item-info">
                      <span className="session-item-name">{session.name}</span>
                      <span className="session-item-meta">
                        {session.playerIds?.length || 0} players • {session.courtCount || 4} courts
                      </span>
                      <span className="session-item-time">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="session-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEndSession(session.id);
                      }}
                      title="End session"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default SessionHamburgerMenu;
