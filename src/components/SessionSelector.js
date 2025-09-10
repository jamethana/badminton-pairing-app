import React, { useState } from 'react';
import { createNewSession } from '../utils/helpers';

const SessionSelector = ({ 
  sessions, 
  currentSessionId, 
  onSessionSelect, 
  onSessionCreate, 
  onSessionDelete 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      const newSession = createNewSession(newSessionName);
      onSessionCreate(newSession);
      setNewSessionName('');
      setIsCreating(false);
    }
  };

  const handleDeleteSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session && window.confirm(`Are you sure you want to delete session "${session.name}"? This will remove all matches and session data.`)) {
      onSessionDelete(sessionId);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="session-selector">
      <div className="session-header">
        <h2 className="session-title">
          🎯 Current Session: {currentSession?.name || 'No Session'}
        </h2>
        <div className="session-actions">
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? 'Cancel' : '+ New Session'}
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSession} className="create-session-form">
          <div className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Enter session name (e.g., 'Morning Game', 'Tournament A')"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="btn btn-primary">
              Create Session
            </button>
          </div>
        </form>
      )}

      {sessions.length > 1 && (
        <div className="session-list">
          <h4 className="session-list-title">Switch Session:</h4>
          <div className="session-grid">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`session-card ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="session-info">
                  <span className="session-name">{session.name}</span>
                  <span className="session-meta">
                    {session.playerIds.length} players • {session.courtCount} courts
                  </span>
                  <span className="session-time">
                    Created: {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {sessions.length > 1 && session.id !== currentSessionId && (
                  <button
                    className="session-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    title="Delete session"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionSelector;
