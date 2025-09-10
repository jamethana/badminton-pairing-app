-- Migration 001: Initial Schema
-- Creates the complete database structure for Badminton Pairing App
-- Run Date: Initial deployment

-- This migration creates all the core tables and relationships
-- for the badminton pairing application

\echo 'Running Migration 001: Initial Schema'

-- Check if migration has already been run
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
        RAISE NOTICE 'Tables already exist, skipping initial schema creation';
    ELSE
        RAISE NOTICE 'Creating initial database schema...';
    END IF;
END
$$;

-- Include the main schema file
\i ../schema.sql

-- Record this migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    description TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_time_ms INTEGER
);

-- Record this migration
INSERT INTO schema_migrations (version, description) 
VALUES ('001', 'Initial schema with all core tables')
ON CONFLICT (version) DO NOTHING;

\echo 'Migration 001 completed successfully'
