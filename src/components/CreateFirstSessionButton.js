import React, { useState } from 'react';
import { createNewSession } from '../utils/helpers';

const CreateFirstSessionButton = ({ onSessionCreate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      const newSession = createNewSession(newSessionName.trim());
      onSessionCreate(newSession);
      setNewSessionName('');
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setNewSessionName('');
  };

  if (isCreating) {
    return (
      <div className="create-session-form-container">
        <form onSubmit={handleCreateSession} className="create-session-form">
          <div className="form-header">
            <h3>Create Session</h3>
            <p>Give your session a name (e.g., "Morning Games", "Tournament Practice")</p>
          </div>
          <div className="input-group">
            <input
              type="text"
              className="input-field session-name-input"
              placeholder="Enter session name..."
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              required
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-large">
              🚀 Create Session
            </button>
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="create-first-session-container">
      <button 
        className="btn btn-primary btn-hero"
        onClick={() => setIsCreating(true)}
      >
        <span className="btn-icon">🚀</span>
        <span className="btn-text">Create Session</span>
        <span className="btn-subtitle">Start organizing badminton matches</span>
      </button>
      
      <div className="quick-start-tips">
        <p className="tips-title">✨ Quick Start Tips:</p>
        <ul className="tips-list">
          <li>Sessions help organize different groups or events</li>
          <li>Add players and manage multiple courts</li>
          <li>Track wins, losses, and ELO ratings</li>
        </ul>
      </div>
    </div>
  );
};

export default CreateFirstSessionButton;
