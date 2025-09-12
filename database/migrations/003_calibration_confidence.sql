-- Migration: Support Lower Confidence During Calibration
-- This migration updates the confidence constraint to allow lower values during calibration period

-- Drop the existing confidence constraint
ALTER TABLE players DROP CONSTRAINT IF EXISTS confidence_range;

-- Add new constraint that allows calibration confidence (0.2 minimum)
ALTER TABLE players ADD CONSTRAINT confidence_range CHECK (confidence >= 0.2 AND confidence <= 1.0);

-- Update the default confidence for new players to calibration starting value
ALTER TABLE players ALTER COLUMN confidence SET DEFAULT 0.3;
