-- Migration: Extend K-Factor Range for Advanced ELO System
-- This migration updates the k_factor constraint to allow values up to 500
-- to support the advanced ELO system's high K-factor for new/calibrating players

-- Drop the existing k_factor constraint
ALTER TABLE elo_history DROP CONSTRAINT IF EXISTS valid_k_factor;

-- Add new constraint that allows K-factors up to 500
ALTER TABLE elo_history ADD CONSTRAINT valid_k_factor CHECK (k_factor >= 1 AND k_factor <= 500);

-- Add a comment to document the reasoning
COMMENT ON CONSTRAINT valid_k_factor ON elo_history IS 'K-factor range: 1-500. High values (400-500) used for new players during calibration period, lower values (10-50) for established players.';
