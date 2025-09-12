import React from 'react';
import CreateFirstSessionButton from '../CreateFirstSessionButton';

/**
 * Welcome page component - shown when no session is selected
 * Displays available sessions and allows creating new ones
 */
const WelcomePage = ({ 
  sessions, 
  onSessionSelect, 
  onSessionCreate 
}) => {
  const activeSessions = sessions.filter(session => 
    session && (session.isActive !== false && session.is_active !== false)
  );

  return (
    <div className="no-sessions-page">
      <div className="no-sessions-content">
        <div className="welcome-message">
          <h2>Welcome to Badminton Pairing! 🏸</h2>
          {sessions.length === 0 ? (
            <p>Get started by creating your first badminton session. You'll be able to organize matches, track player stats, and manage courts all in one place.</p>
          ) : (
            <p>Choose an existing session or create a new one to get started.</p>
          )}
        </div>
        
        {/* Show existing sessions if any */}
        {activeSessions.length > 0 && (
          <div className="existing-sessions">
            <h3>Available Sessions</h3>
            <div className="sessions-grid">
              {activeSessions.map(session => (
                <div 
                  key={session.id} 
                  className="session-card"
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="session-info">
                    <h4 className="session-name">{session.name}</h4>
                    <p className="session-details">
                      Created: {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                    {session.lastActiveAt && (
                      <p className="session-details">
                        Last active: {new Date(session.lastActiveAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="session-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="create-first-session">
          <CreateFirstSessionButton
            onSessionCreate={onSessionCreate}
            existingSessions={sessions}
          />
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
