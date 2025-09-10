// Database Models for Supabase Integration

// Players table
export const PlayerModel = {
  id: 'uuid', // Primary key
  name: 'text',
  email: 'text', // Optional for future user accounts
  created_at: 'timestamp',
  updated_at: 'timestamp',
  
  // Lifetime stats
  total_matches: 'integer',
  total_wins: 'integer', 
  total_losses: 'integer',
  current_elo: 'integer',
  highest_elo: 'integer',
  lowest_elo: 'integer',
  
  // Metadata
  is_active: 'boolean',
  last_match_at: 'timestamp',
  avatar_url: 'text' // Optional for future profile pictures
};

// Sessions table
export const SessionModel = {
  id: 'uuid', // Primary key
  name: 'text',
  description: 'text', // Optional session description
  created_at: 'timestamp',
  updated_at: 'timestamp',
  ended_at: 'timestamp', // When session was ended (null if active)
  
  // Session settings
  court_count: 'integer',
  max_players: 'integer', // Optional player limit
  
  // Session stats
  total_matches_played: 'integer',
  session_duration_minutes: 'integer',
  
  // Status
  is_active: 'boolean',
  created_by: 'uuid' // Foreign key to players (for future user accounts)
};

// Session Players (many-to-many relationship)
export const SessionPlayerModel = {
  id: 'uuid', // Primary key
  session_id: 'uuid', // Foreign key to sessions
  player_id: 'uuid', // Foreign key to players
  joined_at: 'timestamp',
  left_at: 'timestamp', // When player left session (null if still in)
  
  // Session-specific stats
  session_matches: 'integer',
  session_wins: 'integer',
  session_losses: 'integer',
  session_elo_start: 'integer', // ELO when joined session
  session_elo_current: 'integer', // Current ELO in this session
  session_elo_peak: 'integer', // Highest ELO reached in session
  
  // Status
  is_active_in_session: 'boolean'
};

// Matches table
export const MatchModel = {
  id: 'uuid', // Primary key
  session_id: 'uuid', // Foreign key to sessions
  court_number: 'integer',
  
  // Match details
  started_at: 'timestamp',
  completed_at: 'timestamp',
  cancelled_at: 'timestamp', // If match was cancelled
  
  // Teams
  team1_player1_id: 'uuid', // Foreign key to players
  team1_player2_id: 'uuid',
  team2_player1_id: 'uuid', 
  team2_player2_id: 'uuid',
  
  // Results
  winning_team: 'integer', // 1 or 2, null if cancelled
  score_team1: 'integer', // Optional: actual game score
  score_team2: 'integer',
  
  // Match metadata
  match_duration_minutes: 'integer',
  match_type: 'text', // 'doubles', 'singles', etc.
  notes: 'text' // Optional match notes
};

// ELO History table (track ELO changes over time)
export const EloHistoryModel = {
  id: 'uuid', // Primary key
  player_id: 'uuid', // Foreign key to players
  match_id: 'uuid', // Foreign key to matches
  session_id: 'uuid', // Foreign key to sessions
  
  // ELO change details
  elo_before: 'integer',
  elo_after: 'integer',
  elo_change: 'integer', // Positive or negative
  
  // Context
  was_winner: 'boolean',
  opponent_elo: 'integer', // Average ELO of opponents
  created_at: 'timestamp'
};

// Courts table (for future advanced court management)
export const CourtModel = {
  id: 'uuid', // Primary key
  session_id: 'uuid', // Foreign key to sessions
  court_number: 'integer',
  
  // Court details
  name: 'text', // Optional court name
  is_available: 'boolean',
  current_match_id: 'uuid', // Foreign key to matches (null if empty)
  
  // Metadata
  created_at: 'timestamp',
  notes: 'text' // Optional court notes (maintenance, etc.)
};

// Match Events table (detailed match tracking)
export const MatchEventModel = {
  id: 'uuid', // Primary key
  match_id: 'uuid', // Foreign key to matches
  
  // Event details
  event_type: 'text', // 'match_start', 'match_end', 'score_update', 'player_substitution'
  event_data: 'jsonb', // Flexible data storage for different event types
  created_at: 'timestamp',
  
  // Optional references
  player_id: 'uuid', // If event relates to specific player
  created_by: 'uuid' // Who recorded this event
};

// Session Settings table (for future customization)
export const SessionSettingsModel = {
  id: 'uuid', // Primary key  
  session_id: 'uuid', // Foreign key to sessions
  
  // ELO settings
  starting_elo: 'integer',
  win_points: 'integer',
  loss_points: 'integer',
  min_elo: 'integer',
  
  // Match settings
  match_duration_minutes: 'integer',
  auto_generate_matches: 'boolean',
  require_score_entry: 'boolean',
  
  // Notification settings
  notify_on_match_completion: 'boolean',
  notify_on_player_join: 'boolean',
  
  created_at: 'timestamp',
  updated_at: 'timestamp'
};

// Database relationships and constraints
export const DatabaseSchema = {
  relationships: {
    // One-to-many
    'sessions -> session_players': 'session_id',
    'players -> session_players': 'player_id', 
    'sessions -> matches': 'session_id',
    'players -> matches': 'team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id',
    'sessions -> courts': 'session_id',
    'matches -> match_events': 'match_id',
    'players -> elo_history': 'player_id',
    'matches -> elo_history': 'match_id',
    'sessions -> session_settings': 'session_id',
    
    // Constraints
    'unique_session_player': ['session_id', 'player_id'], // Player can only be in session once
    'unique_court_per_session': ['session_id', 'court_number'], // Court numbers unique per session
    'match_team_validation': 'team1_player1_id != team1_player2_id', // No duplicate players
  },
  
  indexes: {
    // Performance indexes for common queries
    'idx_session_players_session': ['session_id'],
    'idx_session_players_player': ['player_id'],
    'idx_matches_session': ['session_id'],
    'idx_matches_players': ['team1_player1_id', 'team1_player2_id', 'team2_player1_id', 'team2_player2_id'],
    'idx_elo_history_player': ['player_id'],
    'idx_elo_history_session': ['session_id'],
    'idx_match_events_match': ['match_id'],
    'idx_players_elo': ['current_elo'],
    'idx_sessions_active': ['is_active'],
    'idx_matches_completed': ['completed_at']
  }
};
