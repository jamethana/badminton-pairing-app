-- Migration: Advanced ELO System Support
-- This migration adds support for the new advanced ELO system features

-- Add confidence field to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE players ADD CONSTRAINT confidence_range CHECK (confidence >= 0.5 AND confidence <= 1.0);

-- Update default ELO values to match new system (1200 instead of 100)
ALTER TABLE players ALTER COLUMN current_elo SET DEFAULT 1200;
ALTER TABLE players ALTER COLUMN highest_elo SET DEFAULT 1200;
ALTER TABLE players ALTER COLUMN lowest_elo SET DEFAULT 1200;

-- Update ELO constraints to match new ranges
ALTER TABLE players DROP CONSTRAINT IF EXISTS valid_elo;
ALTER TABLE players ADD CONSTRAINT valid_elo CHECK (
    current_elo >= 100 AND current_elo <= 3000 AND
    highest_elo >= current_elo AND 
    lowest_elo <= current_elo AND
    highest_elo <= 3000 AND
    lowest_elo >= 100
);

-- Update session_players ELO defaults
ALTER TABLE session_players ALTER COLUMN session_elo_start SET DEFAULT 1200;
ALTER TABLE session_players ALTER COLUMN session_elo_current SET DEFAULT 1200;
ALTER TABLE session_players ALTER COLUMN session_elo_peak SET DEFAULT 1200;

-- Update session_players ELO constraints
ALTER TABLE session_players DROP CONSTRAINT IF EXISTS valid_session_elo;
ALTER TABLE session_players ADD CONSTRAINT valid_session_elo CHECK (
    session_elo_current >= 100 AND session_elo_current <= 3000 AND
    session_elo_peak >= session_elo_current AND
    session_elo_start >= 100 AND session_elo_start <= 3000 AND
    session_elo_peak <= 3000
);

-- Add new fields to elo_history table for advanced ELO system
ALTER TABLE elo_history ADD COLUMN IF NOT EXISTS expected_score DECIMAL(4,3);
ALTER TABLE elo_history ADD COLUMN IF NOT EXISTS k_factor INTEGER;
ALTER TABLE elo_history ADD COLUMN IF NOT EXISTS player_team_elo INTEGER;
ALTER TABLE elo_history ADD COLUMN IF NOT EXISTS opponent_team_elo INTEGER;
ALTER TABLE elo_history ADD COLUMN IF NOT EXISTS match_count INTEGER;
ALTER TABLE elo_history ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2);

-- Update elo_history constraints to match new ELO ranges
ALTER TABLE elo_history DROP CONSTRAINT IF EXISTS valid_elo_values;
ALTER TABLE elo_history ADD CONSTRAINT valid_elo_values CHECK (
    elo_before >= 100 AND elo_before <= 3000 AND 
    elo_after >= 100 AND elo_after <= 3000
);

-- Add constraints for new fields
ALTER TABLE elo_history ADD CONSTRAINT valid_expected_score CHECK (expected_score >= 0.0 AND expected_score <= 1.0);
ALTER TABLE elo_history ADD CONSTRAINT valid_k_factor CHECK (k_factor >= 1 AND k_factor <= 100);
ALTER TABLE elo_history ADD CONSTRAINT valid_team_elos CHECK (
    (player_team_elo IS NULL OR (player_team_elo >= 100 AND player_team_elo <= 3000)) AND
    (opponent_team_elo IS NULL OR (opponent_team_elo >= 100 AND opponent_team_elo <= 3000))
);
ALTER TABLE elo_history ADD CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0.5 AND confidence <= 1.0));

-- Update session_settings with new ELO defaults
ALTER TABLE session_settings ALTER COLUMN starting_elo SET DEFAULT 1200;
ALTER TABLE session_settings ALTER COLUMN min_elo SET DEFAULT 100;

-- Update session_settings constraints
ALTER TABLE session_settings DROP CONSTRAINT IF EXISTS positive_elo_settings;
ALTER TABLE session_settings ADD CONSTRAINT positive_elo_settings CHECK (
    starting_elo >= 100 AND starting_elo <= 3000 AND
    win_points > 0 AND loss_points > 0 AND 
    min_elo >= 100 AND min_elo <= 3000
);

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_players_confidence ON players(confidence);
CREATE INDEX IF NOT EXISTS idx_elo_history_expected_score ON elo_history(expected_score);
CREATE INDEX IF NOT EXISTS idx_elo_history_k_factor ON elo_history(k_factor);

-- Update existing players to have proper confidence and ELO values
UPDATE players 
SET confidence = 1.0 
WHERE confidence IS NULL;

-- Migrate existing players with ELO < 100 to new minimum (100)
UPDATE players 
SET 
    current_elo = GREATEST(current_elo, 100),
    highest_elo = GREATEST(highest_elo, 100),
    lowest_elo = GREATEST(lowest_elo, 100)
WHERE current_elo < 100 OR highest_elo < 100 OR lowest_elo < 100;

-- Migrate existing session players with ELO < 100 to new minimum (100)
UPDATE session_players 
SET 
    session_elo_start = GREATEST(session_elo_start, 100),
    session_elo_current = GREATEST(session_elo_current, 100),
    session_elo_peak = GREATEST(session_elo_peak, 100)
WHERE session_elo_start < 100 OR session_elo_current < 100 OR session_elo_peak < 100;

-- Update the player leaderboard view to handle new ELO ranges
DROP VIEW IF EXISTS player_leaderboard;
CREATE VIEW player_leaderboard AS
SELECT 
    p.*,
    RANK() OVER (ORDER BY p.current_elo DESC) as rank,
    ROUND(p.total_wins::DECIMAL / NULLIF(p.total_matches, 0) * 100, 1) as win_percentage,
    CASE 
        WHEN p.current_elo >= 2400 THEN 'Grandmaster'
        WHEN p.current_elo >= 2200 THEN 'Master'
        WHEN p.current_elo >= 2000 THEN 'Expert'
        WHEN p.current_elo >= 1800 THEN 'Advanced'
        WHEN p.current_elo >= 1600 THEN 'Intermediate'
        WHEN p.current_elo >= 1400 THEN 'Improving'
        WHEN p.current_elo >= 1200 THEN 'Beginner'
        WHEN p.current_elo >= 1000 THEN 'Learning'
        WHEN p.current_elo >= 800 THEN 'Novice'
        ELSE 'Unrated'
    END as tier_name
FROM players p
WHERE p.is_active = TRUE
ORDER BY p.current_elo DESC;

-- Create a view for advanced ELO history with all the new fields
CREATE VIEW detailed_elo_history AS
SELECT 
    eh.*,
    p.name as player_name,
    s.name as session_name,
    CASE 
        WHEN eh.elo_change > 0 THEN 'WIN'
        WHEN eh.elo_change < 0 THEN 'LOSS'
        ELSE 'DRAW'
    END as result,
    CASE
        WHEN eh.expected_score > 0.6 THEN 'Expected Win'
        WHEN eh.expected_score < 0.4 THEN 'Expected Loss'
        ELSE 'Close Match'
    END as match_type
FROM elo_history eh
JOIN players p ON eh.player_id = p.id
JOIN sessions s ON eh.session_id = s.id
ORDER BY eh.created_at DESC;

-- Add comment explaining the migration
COMMENT ON TABLE players IS 'Players table with advanced ELO system support including confidence tracking';
COMMENT ON COLUMN players.confidence IS 'Player confidence rating (0.5-1.0) affecting ELO volatility';
COMMENT ON TABLE elo_history IS 'ELO history with detailed tracking including expected scores, K-factors, and team ELOs';
COMMENT ON COLUMN elo_history.expected_score IS 'Expected match outcome (0.0-1.0) based on ELO difference';
COMMENT ON COLUMN elo_history.k_factor IS 'K-factor used for this ELO calculation (higher = more volatile)';
COMMENT ON COLUMN elo_history.player_team_elo IS 'Combined ELO of player team for doubles matches';
COMMENT ON COLUMN elo_history.opponent_team_elo IS 'Combined ELO of opponent team for doubles matches';
