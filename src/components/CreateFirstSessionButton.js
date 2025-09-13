import React, { useState } from 'react';
import { createNewSession } from '../utils/helpers';
import { createSupabaseClient } from '../config/supabase';

const CreateFirstSessionButton = ({ onSessionCreate, existingSessions = [] }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      // Check for duplicate session names
      const existingSession = existingSessions.find(s => 
        s.name.toLowerCase() === newSessionName.trim().toLowerCase()
      );
      
      if (existingSession) {
        alert(`Session "${newSessionName.trim()}" already exists. Please choose a different name.`);
        return;
      }
      
      try {
        // Create session in Supabase to get proper UUID
        const client = await createSupabaseClient();
        
        if (!client) {
          throw new Error('Supabase client not available');
        }

        const { data, error } = await client
          .from('sessions')
          .insert({
            name: newSessionName.trim(),
            court_count: 4,
            is_active: true
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Transform to local format
        const newSession = {
          id: data.id, // This will be a proper UUID from Supabase
          name: data.name,
          createdAt: data.created_at,
          lastActiveAt: data.updated_at,
          playerIds: [],
          courtCount: data.court_count,
          currentMatches: [],
          courtStates: Array.from({ length: data.court_count }, (_, i) => ({
            id: i,
            isOccupied: false,
            currentMatch: null
          })),
          smartMatching: {
            enabled: false,
            eloRange: 500,
            teamBalance: 250,
            varietyWeight: 0.2
          }
        };

        onSessionCreate(newSession);
        setNewSessionName('');
        setIsCreating(false);
      } catch (error) {
        console.error('Error creating session:', error);
        alert(`Failed to create session: ${error.message}`);
      }
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
