-- Badminton Pairing App - Supabase Database Schema
-- Run this in Supabase SQL Editor to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Lifetime stats
    total_matches INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    current_elo INTEGER DEFAULT 100,
    highest_elo INTEGER DEFAULT 100,
    lowest_elo INTEGER DEFAULT 100,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    last_match_at TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    
    -- Constraints
    CONSTRAINT positive_stats CHECK (total_matches >= 0 AND total_wins >= 0 AND total_losses >= 0),
    CONSTRAINT valid_elo CHECK (current_elo >= 1 AND highest_elo >= current_elo AND lowest_elo <= current_elo),
    CONSTRAINT wins_losses_match_total CHECK (total_wins + total_losses <= total_matches)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Session settings
    court_count INTEGER DEFAULT 4,
    max_players INTEGER,
    
    -- Session stats
    total_matches_played INTEGER DEFAULT 0,
    session_duration_minutes INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES players(id),
    
    -- Constraints
    CONSTRAINT positive_courts CHECK (court_count > 0),
    CONSTRAINT positive_matches CHECK (total_matches_played >= 0)
);

-- Session Players (many-to-many relationship)
CREATE TABLE session_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    -- Session-specific stats
    session_matches INTEGER DEFAULT 0,
    session_wins INTEGER DEFAULT 0,
    session_losses INTEGER DEFAULT 0,
    session_elo_start INTEGER DEFAULT 100,
    session_elo_current INTEGER DEFAULT 100,
    session_elo_peak INTEGER DEFAULT 100,
    
    -- Status
    is_active_in_session BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    UNIQUE(session_id, player_id),
    CONSTRAINT positive_session_stats CHECK (session_matches >= 0 AND session_wins >= 0 AND session_losses >= 0),
    CONSTRAINT session_wins_losses_total CHECK (session_wins + session_losses <= session_matches),
    CONSTRAINT valid_session_elo CHECK (session_elo_current >= 1 AND session_elo_peak >= session_elo_current)
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    court_number INTEGER NOT NULL,
    
    -- Match timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Teams
    team1_player1_id UUID NOT NULL REFERENCES players(id),
    team1_player2_id UUID NOT NULL REFERENCES players(id),
    team2_player1_id UUID NOT NULL REFERENCES players(id),
    team2_player2_id UUID NOT NULL REFERENCES players(id),
    
    -- Results
    winning_team INTEGER CHECK (winning_team IN (1, 2)),
    score_team1 INTEGER CHECK (score_team1 >= 0),
    score_team2 INTEGER CHECK (score_team2 >= 0),
    
    -- Metadata
    match_duration_minutes INTEGER,
    match_type TEXT DEFAULT 'doubles',
    notes TEXT,
    
    -- Constraints
    CONSTRAINT different_players CHECK (
        team1_player1_id != team1_player2_id AND
        team1_player1_id != team2_player1_id AND
        team1_player1_id != team2_player2_id AND
        team1_player2_id != team2_player1_id AND
        team1_player2_id != team2_player2_id AND
        team2_player1_id != team2_player2_id
    ),
    CONSTRAINT match_completed_or_cancelled CHECK (
        (completed_at IS NOT NULL AND cancelled_at IS NULL) OR
        (completed_at IS NULL AND cancelled_at IS NOT NULL) OR
        (completed_at IS NULL AND cancelled_at IS NULL)
    ),
    CONSTRAINT winner_only_when_completed CHECK (
        (completed_at IS NOT NULL AND winning_team IS NOT NULL) OR
        (completed_at IS NULL AND winning_team IS NULL)
    )
);

-- ELO History table
CREATE TABLE elo_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- ELO change details
    elo_before INTEGER NOT NULL,
    elo_after INTEGER NOT NULL,
    elo_change INTEGER NOT NULL,
    
    -- Context
    was_winner BOOLEAN NOT NULL,
    opponent_elo INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_elo_change CHECK (elo_change = elo_after - elo_before),
    CONSTRAINT valid_elo_values CHECK (elo_before >= 1 AND elo_after >= 1)
);

-- Courts table
CREATE TABLE courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    court_number INTEGER NOT NULL,
    
    -- Court details
    name TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    current_match_id UUID REFERENCES matches(id),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    -- Constraints
    UNIQUE(session_id, court_number),
    CONSTRAINT positive_court_number CHECK (court_number >= 0)
);

-- Match Events table
CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional references
    player_id UUID REFERENCES players(id),
    created_by UUID REFERENCES players(id)
);

-- Session Settings table
CREATE TABLE session_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- ELO settings
    starting_elo INTEGER DEFAULT 100,
    win_points INTEGER DEFAULT 25,
    loss_points INTEGER DEFAULT 23,
    min_elo INTEGER DEFAULT 1,
    
    -- Match settings
    match_duration_minutes INTEGER DEFAULT 30,
    auto_generate_matches BOOLEAN DEFAULT FALSE,
    require_score_entry BOOLEAN DEFAULT FALSE,
    
    -- Notification settings
    notify_on_match_completion BOOLEAN DEFAULT TRUE,
    notify_on_player_join BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(session_id),
    CONSTRAINT positive_elo_settings CHECK (starting_elo > 0 AND win_points > 0 AND loss_points > 0 AND min_elo > 0)
);

-- Indexes for performance
CREATE INDEX idx_session_players_session ON session_players(session_id);
CREATE INDEX idx_session_players_player ON session_players(player_id);
CREATE INDEX idx_session_players_active ON session_players(session_id, is_active_in_session);

CREATE INDEX idx_matches_session ON matches(session_id);
CREATE INDEX idx_matches_court ON matches(session_id, court_number);
CREATE INDEX idx_matches_completed ON matches(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_matches_players ON matches(team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id);

CREATE INDEX idx_elo_history_player ON elo_history(player_id);
CREATE INDEX idx_elo_history_session ON elo_history(session_id);
CREATE INDEX idx_elo_history_match ON elo_history(match_id);
CREATE INDEX idx_elo_history_timeline ON elo_history(player_id, created_at);

CREATE INDEX idx_match_events_match ON match_events(match_id);
CREATE INDEX idx_match_events_type ON match_events(event_type);
CREATE INDEX idx_match_events_timeline ON match_events(created_at);

CREATE INDEX idx_players_elo ON players(current_elo DESC);
CREATE INDEX idx_players_active ON players(is_active);
CREATE INDEX idx_players_name ON players(name);

CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_sessions_created ON sessions(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_settings_updated_at BEFORE UPDATE ON session_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for future multi-tenancy
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow all for now, will be restricted when auth is added)
CREATE POLICY "Allow all operations for now" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON session_players FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON matches FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON elo_history FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON courts FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON match_events FOR ALL USING (true);
CREATE POLICY "Allow all operations for now" ON session_settings FOR ALL USING (true);

-- Views for common queries
CREATE VIEW player_leaderboard AS
SELECT 
    p.*,
    RANK() OVER (ORDER BY p.current_elo DESC) as rank,
    ROUND(p.total_wins::DECIMAL / NULLIF(p.total_matches, 0) * 100, 1) as win_percentage
FROM players p
WHERE p.is_active = TRUE
ORDER BY p.current_elo DESC;

CREATE VIEW session_leaderboard AS
SELECT 
    sp.*,
    p.name as player_name,
    s.name as session_name,
    RANK() OVER (PARTITION BY sp.session_id ORDER BY sp.session_wins DESC, sp.session_losses ASC) as session_rank,
    ROUND(sp.session_wins::DECIMAL / NULLIF(sp.session_matches, 0) * 100, 1) as session_win_percentage
FROM session_players sp
JOIN players p ON sp.player_id = p.id
JOIN sessions s ON sp.session_id = s.id
WHERE sp.is_active_in_session = TRUE
ORDER BY sp.session_id, session_rank;

CREATE VIEW recent_matches AS
SELECT 
    m.*,
    s.name as session_name,
    p1.name as team1_player1_name,
    p2.name as team1_player2_name,
    p3.name as team2_player1_name,
    p4.name as team2_player2_name
FROM matches m
JOIN sessions s ON m.session_id = s.id
JOIN players p1 ON m.team1_player1_id = p1.id
JOIN players p2 ON m.team1_player2_id = p2.id
JOIN players p3 ON m.team2_player1_id = p3.id
JOIN players p4 ON m.team2_player2_id = p4.id
WHERE m.completed_at IS NOT NULL
ORDER BY m.completed_at DESC;

-- Sample data insertion functions
CREATE OR REPLACE FUNCTION create_sample_data()
RETURNS VOID AS $$
DECLARE
    sample_session_id UUID;
    sample_player1_id UUID;
    sample_player2_id UUID;
    sample_player3_id UUID;
    sample_player4_id UUID;
BEGIN
    -- Create sample players
    INSERT INTO players (name, current_elo, total_wins, total_losses, total_matches)
    VALUES 
        ('Alice Johnson', 150, 15, 5, 20),
        ('Bob Smith', 125, 10, 8, 18),
        ('Carol Davis', 175, 20, 3, 23),
        ('David Wilson', 95, 5, 12, 17)
    RETURNING id INTO sample_player1_id, sample_player2_id, sample_player3_id, sample_player4_id;
    
    -- Create sample session
    INSERT INTO sessions (name, description, court_count)
    VALUES ('Sample Tournament', 'Demo session with sample data', 4)
    RETURNING id INTO sample_session_id;
    
    -- Add players to session
    INSERT INTO session_players (session_id, player_id, session_wins, session_losses, session_matches, session_elo_current)
    VALUES 
        (sample_session_id, sample_player1_id, 3, 1, 4, 120),
        (sample_session_id, sample_player2_id, 2, 2, 4, 110),
        (sample_session_id, sample_player3_id, 4, 0, 4, 140),
        (sample_session_id, sample_player4_id, 1, 3, 4, 80);
    
    RAISE NOTICE 'Sample data created successfully';
END;
$$ LANGUAGE plpgsql;

-- Data migration functions (for migrating from localStorage)
CREATE OR REPLACE FUNCTION migrate_player_data(player_data JSONB)
RETURNS UUID AS $$
DECLARE
    new_player_id UUID;
BEGIN
    INSERT INTO players (
        name, 
        current_elo, 
        total_wins, 
        total_losses, 
        total_matches,
        highest_elo,
        lowest_elo,
        is_active,
        last_match_at
    )
    VALUES (
        player_data->>'name',
        COALESCE((player_data->>'elo')::INTEGER, 100),
        COALESCE((player_data->>'wins')::INTEGER, 0),
        COALESCE((player_data->>'losses')::INTEGER, 0),
        COALESCE((player_data->>'matchCount')::INTEGER, 0),
        COALESCE((player_data->>'elo')::INTEGER, 100),
        COALESCE((player_data->>'elo')::INTEGER, 100),
        COALESCE((player_data->>'isActive')::BOOLEAN, TRUE),
        CASE 
            WHEN player_data->>'lastMatchTime' IS NOT NULL 
            THEN (player_data->>'lastMatchTime')::TIMESTAMP WITH TIME ZONE
            ELSE NULL
        END
    )
    RETURNING id INTO new_player_id;
    
    RETURN new_player_id;
END;
$$ LANGUAGE plpgsql;

-- Useful queries for analytics
-- Top players by ELO
-- SELECT * FROM player_leaderboard LIMIT 10;

-- Session performance
-- SELECT 
--     s.name,
--     COUNT(sp.id) as player_count,
--     COUNT(m.id) as total_matches,
--     AVG(sp.session_elo_current) as avg_session_elo
-- FROM sessions s
-- LEFT JOIN session_players sp ON s.id = sp.session_id
-- LEFT JOIN matches m ON s.id = m.session_id
-- WHERE s.is_active = TRUE
-- GROUP BY s.id, s.name;

-- Player improvement tracking
-- SELECT 
--     p.name,
--     eh.elo_before,
--     eh.elo_after,
--     eh.elo_change,
--     eh.created_at
-- FROM elo_history eh
-- JOIN players p ON eh.player_id = p.id
-- WHERE p.id = 'PLAYER_ID_HERE'
-- ORDER BY eh.created_at DESC;
