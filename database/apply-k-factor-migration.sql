-- Quick script to apply the K-factor migration
-- Run this in your Supabase SQL Editor

-- Step 1: Check current constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'valid_k_factor' 
AND conrelid = 'elo_history'::regclass;

-- Step 2: Apply the migration
-- Drop the existing k_factor constraint
ALTER TABLE elo_history DROP CONSTRAINT IF EXISTS valid_k_factor;

-- Add new constraint that allows K-factors up to 500
ALTER TABLE elo_history ADD CONSTRAINT valid_k_factor CHECK (k_factor >= 1 AND k_factor <= 500);

-- Add a comment to document the reasoning
COMMENT ON CONSTRAINT valid_k_factor ON elo_history IS 'K-factor range: 1-500. High values (400-500) used for new players during calibration period, lower values (10-50) for established players.';

-- Step 3: Verify the new constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'valid_k_factor' 
AND conrelid = 'elo_history'::regclass;

-- Success message
SELECT 'K-factor constraint successfully updated to allow values up to 500' AS status;
