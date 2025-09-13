import React, { useState, useMemo } from 'react';
import CreateFirstSessionButton from '../CreateFirstSessionButton';
import Notification from '../Notification';
import { createNewSession } from '../../utils/helpers';
import { createSupabaseClient } from '../../config/supabase';

const WelcomePage = ({
  safeSessions,
  onSessionSelect,
  onSessionCreate,
  onNavigateHome,
  notification,
  showNotification
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'created'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'active', 'recent'
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Filter and sort sessions
  const filteredAndSortedSessions = useMemo(() => {
    let sessions = safeSessions.filter(session => 
      session && (session.isActive !== false && session.is_active !== false)
    );

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      sessions = sessions.filter(session =>
        session.name.toLowerCase().includes(query) ||
        (session.description && session.description.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    if (filterBy === 'recent') {
      sessions = sessions.filter(session => {
        const lastActive = session.lastActiveAt ? new Date(session.lastActiveAt) : new Date(session.createdAt);
        return lastActive > weekAgo;
      });
    }

    // Sort sessions
    sessions.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'recent':
        default:
          const aDate = a.lastActiveAt ? new Date(a.lastActiveAt) : new Date(a.createdAt);
          const bDate = b.lastActiveAt ? new Date(b.lastActiveAt) : new Date(b.createdAt);
          return bDate - aDate;
      }
    });

    return sessions;
  }, [safeSessions, searchQuery, sortBy, filterBy]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  const getSessionStats = (session) => {
    const playerCount = session.sessionPlayers?.length || 0;
    const activeMatches = session.currentMatches?.length || 0;
    return { playerCount, activeMatches };
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (newSessionName.trim()) {
      // Check for duplicate session names
      const existingSession = safeSessions.find(s => 
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
        setIsCreatingSession(false);
      } catch (error) {
        console.error('Error creating session:', error);
        alert(`Failed to create session: ${error.message}`);
      }
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingSession(false);
    setNewSessionName('');
  };

  return (
    <div className="App">
      <div className="container">
        {/* Modern Header */}
        <header className="welcome-header">
          <div 
            className="app-title-modern clickable" 
            onClick={onNavigateHome}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            title="Go to welcome page"
          >
            <div className="app-title-content">
              <h1 className="app-title-text">Badminton Pairing</h1>
              <div className="app-title-subtitle">Smart Match Organization</div>
            </div>
          </div>
        </header>

        <div className="welcome-page-modern">
          {/* Hero Section */}
          <div className="welcome-hero">
            <div className="hero-content">
              <h2 className="hero-title">
                {safeSessions.length === 0 ? (
                  <>Welcome to Badminton Pairing! 🏸</>
                ) : (
                  <>Welcome back! 🏸</>
                )}
              </h2>
              <p className="hero-subtitle">
                {safeSessions.length === 0 ? (
                  "Get started by creating your first badminton session. You'll be able to organize matches, track player stats, and manage courts all in one place."
                ) : (
                  `Choose from available sessions or create a new one to get started.`
                )}
              </p>
            </div>
          </div>

          {/* Sessions Section */}
          {safeSessions.length > 0 && (
            <div className="sessions-section">
              {/* Search and Filter Controls */}
              <div className="sessions-controls">
                <div className="controls-content">
                  <div className="search-container">
                    <div className="search-input-wrapper">
                      <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                        <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button 
                          className="clear-search"
                          onClick={() => setSearchQuery('')}
                          title="Clear search"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="filter-controls">
                    <select 
                      className="filter-select"
                      value={filterBy}
                      onChange={(e) => setFilterBy(e.target.value)}
                    >
                      <option value="all">All Sessions</option>
                      <option value="recent">Recent (7 days)</option>
                    </select>

                    <select 
                      className="filter-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="recent">Sort by Recent</option>
                      <option value="name">Sort by Name</option>
                      <option value="created">Sort by Created</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="sessions-summary">
                <span className="results-count">
                  {filteredAndSortedSessions.length} session{filteredAndSortedSessions.length !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                </span>
              </div>

              {/* Sessions Grid */}
              <div className="sessions-grid-modern">
                {/* Create New Session Card - Always First */}
                {isCreatingSession ? (
                  <div key="create-session-form" className="create-session-form-card">
                    <form onSubmit={handleCreateSession} className="session-form">
                      <div className="form-header-compact">
                        <h3>Create New Session</h3>
                      </div>
                      <div className="input-group-compact">
                        <input
                          type="text"
                          className="input-field-compact"
                          placeholder="Enter session name..."
                          value={newSessionName}
                          onChange={(e) => setNewSessionName(e.target.value)}
                          required
                          autoFocus
                          maxLength={50}
                        />
                      </div>
                      <div className="form-actions-compact">
                        <button type="submit" className="btn-create-compact">
                          Create
                        </button>
                        <button 
                          type="button" 
                          className="btn-cancel-compact"
                          onClick={handleCancelCreate}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div key="create-new-session" className="create-session-card" onClick={() => setIsCreatingSession(true)}>
                    <div className="create-session-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="create-session-text">
                      <h3>Create New Session</h3>
                      <p>Start a new badminton session</p>
                    </div>
                  </div>
                )}

                {/* Existing Sessions */}
                {filteredAndSortedSessions.length > 0 && filteredAndSortedSessions.map(session => {
                  const stats = getSessionStats(session);
                  const lastActiveTime = session.lastActiveAt || session.createdAt;
                  
                  return (
                    <div 
                      key={session.id} 
                      className="session-card-modern"
                      onClick={() => onSessionSelect(session.id)}
                    >
                      <div className="session-card-header">
                        <h3 className="session-card-name">{session.name}</h3>
                        <div className="session-card-time">
                          {getTimeAgo(lastActiveTime)}
                        </div>
                      </div>
                      
                      <div className="session-card-stats">
                        <span className="stat-compact">
                          {stats.playerCount} players
                        </span>
                        {stats.activeMatches > 0 && (
                          <span className="stat-compact active">
                            {stats.activeMatches} active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredAndSortedSessions.length === 0 && searchQuery && (
                <div className="no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3 className="no-results-title">No sessions found</h3>
                  <p className="no-results-subtitle">
                    Try adjusting your search or filters
                  </p>
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterBy('all');
                    }}
                  >
                    Clear search and filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Create Session Section - Only show if no sessions exist */}
          {safeSessions.length === 0 && (
            <div className="create-session-section">
              <CreateFirstSessionButton
                onSessionCreate={onSessionCreate}
                existingSessions={safeSessions}
              />
            </div>
          )}
        </div>

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => showNotification(null)}
          />
        )}
      </div>
    </div>
  );
};

export default WelcomePage;