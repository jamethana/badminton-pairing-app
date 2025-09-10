-- Advanced Analytics Queries for Badminton Pairing App
-- These queries demonstrate the head-to-head and partnership analysis capabilities

-- ============================================
-- HEAD-TO-HEAD ANALYSIS
-- ============================================

-- 1. Head-to-head win rate between two specific players
-- Replace 'PLAYER1_ID' and 'PLAYER2_ID' with actual UUIDs
WITH head_to_head AS (
  SELECT 
    m.*,
    CASE 
      WHEN (m.team1_player1_id = 'PLAYER1_ID' OR m.team1_player2_id = 'PLAYER1_ID') THEN 1
      ELSE 2
    END as player1_team,
    CASE
      WHEN (m.team1_player1_id = 'PLAYER2_ID' OR m.team1_player2_id = 'PLAYER2_ID') THEN 1  
      ELSE 2
    END as player2_team
  FROM matches m
  WHERE m.completed_at IS NOT NULL
    AND (
      m.team1_player1_id IN ('PLAYER1_ID', 'PLAYER2_ID') OR
      m.team1_player2_id IN ('PLAYER1_ID', 'PLAYER2_ID') OR
      m.team2_player1_id IN ('PLAYER1_ID', 'PLAYER2_ID') OR
      m.team2_player2_id IN ('PLAYER1_ID', 'PLAYER2_ID')
    )
    AND (
      (m.team1_player1_id = 'PLAYER1_ID' OR m.team1_player2_id = 'PLAYER1_ID') AND
      (m.team2_player1_id = 'PLAYER2_ID' OR m.team2_player2_id = 'PLAYER2_ID')
    ) OR (
      (m.team2_player1_id = 'PLAYER1_ID' OR m.team2_player2_id = 'PLAYER1_ID') AND
      (m.team1_player1_id = 'PLAYER2_ID' OR m.team1_player2_id = 'PLAYER2_ID')
    )
)
SELECT 
  p1.name as player1_name,
  p2.name as player2_name,
  COUNT(*) as total_matches,
  SUM(CASE WHEN h.winning_team = h.player1_team THEN 1 ELSE 0 END) as player1_wins,
  SUM(CASE WHEN h.winning_team = h.player2_team THEN 1 ELSE 0 END) as player2_wins,
  ROUND(
    SUM(CASE WHEN h.winning_team = h.player1_team THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 
    1
  ) as player1_win_percentage,
  ROUND(
    SUM(CASE WHEN h.winning_team = h.player2_team THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 
    1
  ) as player2_win_percentage
FROM head_to_head h
JOIN players p1 ON p1.id = 'PLAYER1_ID'
JOIN players p2 ON p2.id = 'PLAYER2_ID'
GROUP BY p1.name, p2.name;

-- 2. Complete head-to-head matrix for all players
WITH player_matchups AS (
  SELECT DISTINCT
    CASE 
      WHEN m.team1_player1_id < m.team2_player1_id THEN m.team1_player1_id
      WHEN m.team1_player1_id < m.team2_player2_id THEN m.team1_player1_id
      WHEN m.team1_player2_id < m.team2_player1_id THEN m.team1_player2_id
      ELSE m.team1_player2_id
    END as player1_id,
    CASE
      WHEN m.team1_player1_id < m.team2_player1_id THEN m.team2_player1_id
      WHEN m.team1_player1_id < m.team2_player2_id THEN m.team2_player2_id  
      WHEN m.team1_player2_id < m.team2_player1_id THEN m.team2_player1_id
      ELSE m.team2_player2_id
    END as player2_id,
    m.id as match_id,
    m.winning_team,
    CASE
      WHEN (m.team1_player1_id = player1_id OR m.team1_player2_id = player1_id) THEN 1
      ELSE 2  
    END as player1_team
  FROM matches m
  WHERE m.completed_at IS NOT NULL
)
SELECT 
  p1.name as player1,
  p2.name as player2,
  COUNT(*) as matches,
  SUM(CASE WHEN pm.winning_team = pm.player1_team THEN 1 ELSE 0 END) as player1_wins,
  ROUND(
    SUM(CASE WHEN pm.winning_team = pm.player1_team THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100,
    1
  ) as player1_win_rate
FROM player_matchups pm
JOIN players p1 ON pm.player1_id = p1.id
JOIN players p2 ON pm.player2_id = p2.id  
GROUP BY p1.id, p1.name, p2.id, p2.name
HAVING COUNT(*) >= 3  -- Only show matchups with 3+ matches
ORDER BY player1_win_rate DESC;

-- ============================================
-- PARTNERSHIP ANALYSIS
-- ============================================

-- 3. Partnership win rates for doubles matches
WITH partnerships AS (
  SELECT 
    CASE 
      WHEN m.team1_player1_id < m.team1_player2_id THEN m.team1_player1_id 
      ELSE m.team1_player2_id 
    END as partner1_id,
    CASE 
      WHEN m.team1_player1_id < m.team1_player2_id THEN m.team1_player2_id 
      ELSE m.team1_player1_id 
    END as partner2_id,
    CASE WHEN m.winning_team = 1 THEN 1 ELSE 0 END as won
  FROM matches m
  WHERE m.completed_at IS NOT NULL 
    AND m.match_type = 'doubles'
    AND m.team1_player1_id IS NOT NULL 
    AND m.team1_player2_id IS NOT NULL
    
  UNION ALL
  
  SELECT 
    CASE 
      WHEN m.team2_player1_id < m.team2_player2_id THEN m.team2_player1_id 
      ELSE m.team2_player2_id 
    END as partner1_id,
    CASE 
      WHEN m.team2_player1_id < m.team2_player2_id THEN m.team2_player2_id 
      ELSE m.team2_player1_id 
    END as partner2_id,
    CASE WHEN m.winning_team = 2 THEN 1 ELSE 0 END as won
  FROM matches m
  WHERE m.completed_at IS NOT NULL 
    AND m.match_type = 'doubles'
    AND m.team2_player1_id IS NOT NULL 
    AND m.team2_player2_id IS NOT NULL
)
SELECT 
  p1.name as partner1,
  p2.name as partner2,
  COUNT(*) as matches_together,
  SUM(won) as wins_together,
  ROUND(SUM(won)::DECIMAL / COUNT(*) * 100, 1) as partnership_win_rate,
  ROUND(AVG(won)::DECIMAL, 3) as synergy_score
FROM partnerships p
JOIN players p1 ON p.partner1_id = p1.id
JOIN players p2 ON p.partner2_id = p2.id
GROUP BY p1.id, p1.name, p2.id, p2.name
HAVING COUNT(*) >= 2  -- Only partnerships with 2+ matches
ORDER BY partnership_win_rate DESC, matches_together DESC;

-- 4. Best and worst partnerships for a specific player
-- Replace 'TARGET_PLAYER_ID' with actual UUID
WITH player_partnerships AS (
  SELECT 
    CASE 
      WHEN m.team1_player1_id = 'TARGET_PLAYER_ID' THEN m.team1_player2_id
      WHEN m.team1_player2_id = 'TARGET_PLAYER_ID' THEN m.team1_player1_id
      WHEN m.team2_player1_id = 'TARGET_PLAYER_ID' THEN m.team2_player2_id  
      WHEN m.team2_player2_id = 'TARGET_PLAYER_ID' THEN m.team2_player1_id
    END as partner_id,
    CASE
      WHEN (m.team1_player1_id = 'TARGET_PLAYER_ID' OR m.team1_player2_id = 'TARGET_PLAYER_ID') 
        AND m.winning_team = 1 THEN 1
      WHEN (m.team2_player1_id = 'TARGET_PLAYER_ID' OR m.team2_player2_id = 'TARGET_PLAYER_ID') 
        AND m.winning_team = 2 THEN 1
      ELSE 0
    END as won
  FROM matches m
  WHERE m.completed_at IS NOT NULL
    AND m.match_type = 'doubles'
    AND (
      m.team1_player1_id = 'TARGET_PLAYER_ID' OR
      m.team1_player2_id = 'TARGET_PLAYER_ID' OR  
      m.team2_player1_id = 'TARGET_PLAYER_ID' OR
      m.team2_player2_id = 'TARGET_PLAYER_ID'
    )
    AND (
      (m.team1_player1_id = 'TARGET_PLAYER_ID' AND m.team1_player2_id IS NOT NULL) OR
      (m.team1_player2_id = 'TARGET_PLAYER_ID' AND m.team1_player1_id IS NOT NULL) OR
      (m.team2_player1_id = 'TARGET_PLAYER_ID' AND m.team2_player2_id IS NOT NULL) OR  
      (m.team2_player2_id = 'TARGET_PLAYER_ID' AND m.team2_player1_id IS NOT NULL)
    )
)
SELECT 
  tp.name as target_player,
  p.name as partner,
  COUNT(*) as matches,
  SUM(pp.won) as wins,
  ROUND(SUM(pp.won)::DECIMAL / COUNT(*) * 100, 1) as win_rate,
  CASE 
    WHEN ROUND(SUM(pp.won)::DECIMAL / COUNT(*) * 100, 1) >= 70 THEN '🔥 Excellent'
    WHEN ROUND(SUM(pp.won)::DECIMAL / COUNT(*) * 100, 1) >= 60 THEN '👍 Good'
    WHEN ROUND(SUM(pp.won)::DECIMAL / COUNT(*) * 100, 1) >= 40 THEN '😐 Average'  
    ELSE '👎 Poor'
  END as partnership_rating
FROM player_partnerships pp
JOIN players p ON pp.partner_id = p.id
JOIN players tp ON tp.id = 'TARGET_PLAYER_ID'
WHERE pp.partner_id IS NOT NULL
GROUP BY tp.name, p.id, p.name
HAVING COUNT(*) >= 2
ORDER BY win_rate DESC;

-- ============================================
-- ADVANCED ANALYTICS
-- ============================================

-- 5. Player performance against different skill levels
WITH player_skill_analysis AS (
  SELECT 
    p1.id as player_id,
    p1.name as player_name,
    p1.current_elo,
    p2.id as opponent_id,
    p2.name as opponent_name,
    p2.current_elo as opponent_elo,
    CASE
      WHEN p2.current_elo - p1.current_elo > 50 THEN 'vs_higher'
      WHEN p2.current_elo - p1.current_elo < -50 THEN 'vs_lower'
      ELSE 'vs_similar'
    END as skill_tier,
    COUNT(*) as matches,
    SUM(
      CASE 
        WHEN (m.team1_player1_id = p1.id OR m.team1_player2_id = p1.id) AND m.winning_team = 1 THEN 1
        WHEN (m.team2_player1_id = p1.id OR m.team2_player2_id = p1.id) AND m.winning_team = 2 THEN 1
        ELSE 0
      END
    ) as wins
  FROM players p1
  CROSS JOIN players p2
  JOIN matches m ON (
    (m.team1_player1_id = p1.id OR m.team1_player2_id = p1.id OR 
     m.team2_player1_id = p1.id OR m.team2_player2_id = p1.id) AND
    (m.team1_player1_id = p2.id OR m.team1_player2_id = p2.id OR
     m.team2_player1_id = p2.id OR m.team2_player2_id = p2.id) AND
    NOT (
      (m.team1_player1_id = p1.id OR m.team1_player2_id = p1.id) AND
      (m.team1_player1_id = p2.id OR m.team1_player2_id = p2.id)
    ) AND NOT (
      (m.team2_player1_id = p1.id OR m.team2_player2_id = p1.id) AND  
      (m.team2_player1_id = p2.id OR m.team2_player2_id = p2.id)
    )
  )
  WHERE m.completed_at IS NOT NULL
    AND p1.id != p2.id
  GROUP BY p1.id, p1.name, p1.current_elo, p2.id, p2.name, p2.current_elo
)
SELECT 
  player_name,
  current_elo,
  skill_tier,
  SUM(matches) as total_matches,
  SUM(wins) as total_wins,
  ROUND(SUM(wins)::DECIMAL / SUM(matches) * 100, 1) as win_rate
FROM player_skill_analysis
GROUP BY player_id, player_name, current_elo, skill_tier
ORDER BY player_name, skill_tier;

-- 6. Most dominant player matchups (biggest win rate differences)
WITH head_to_head_summary AS (
  SELECT 
    p1.id as player1_id,
    p1.name as player1_name,
    p2.id as player2_id, 
    p2.name as player2_name,
    COUNT(*) as matches,
    SUM(
      CASE
        WHEN (m.team1_player1_id = p1.id OR m.team1_player2_id = p1.id) AND m.winning_team = 1 THEN 1
        WHEN (m.team2_player1_id = p1.id OR m.team2_player2_id = p1.id) AND m.winning_team = 2 THEN 1
        ELSE 0
      END
    ) as player1_wins
  FROM players p1
  CROSS JOIN players p2  
  JOIN matches m ON (
    -- Both players in match, on opposite teams
    (m.team1_player1_id = p1.id OR m.team1_player2_id = p1.id OR 
     m.team2_player1_id = p1.id OR m.team2_player2_id = p1.id) AND
    (m.team1_player1_id = p2.id OR m.team1_player2_id = p2.id OR
     m.team2_player1_id = p2.id OR m.team2_player2_id = p2.id) AND
    -- Not on same team
    NOT (
      (m.team1_player1_id IN (p1.id, p2.id) AND m.team1_player2_id IN (p1.id, p2.id)) OR
      (m.team2_player1_id IN (p1.id, p2.id) AND m.team2_player2_id IN (p1.id, p2.id))
    )
  )
  WHERE m.completed_at IS NOT NULL
    AND p1.id != p2.id
  GROUP BY p1.id, p1.name, p2.id, p2.name
  HAVING COUNT(*) >= 3
)
SELECT 
  player1_name,
  player2_name, 
  matches,
  player1_wins,
  matches - player1_wins as player2_wins,
  ROUND(player1_wins::DECIMAL / matches * 100, 1) as player1_win_rate,
  ROUND((matches - player1_wins)::DECIMAL / matches * 100, 1) as player2_win_rate,
  ABS(ROUND(player1_wins::DECIMAL / matches * 100, 1) - 50) as dominance_factor
FROM head_to_head_summary
ORDER BY dominance_factor DESC, matches DESC;

-- ============================================
-- PARTNERSHIP ANALYSIS  
-- ============================================

-- 7. Best partnerships (highest win rates when playing together)
WITH partnership_stats AS (
  SELECT 
    LEAST(m.team1_player1_id, m.team1_player2_id) as partner1_id,
    GREATEST(m.team1_player1_id, m.team1_player2_id) as partner2_id,
    CASE WHEN m.winning_team = 1 THEN 1 ELSE 0 END as won
  FROM matches m
  WHERE m.completed_at IS NOT NULL
    AND m.match_type = 'doubles'
    AND m.team1_player1_id IS NOT NULL
    AND m.team1_player2_id IS NOT NULL
    
  UNION ALL
  
  SELECT 
    LEAST(m.team2_player1_id, m.team2_player2_id) as partner1_id,
    GREATEST(m.team2_player1_id, m.team2_player2_id) as partner2_id,
    CASE WHEN m.winning_team = 2 THEN 1 ELSE 0 END as won
  FROM matches m
  WHERE m.completed_at IS NOT NULL
    AND m.match_type = 'doubles'
    AND m.team2_player1_id IS NOT NULL
    AND m.team2_player2_id IS NOT NULL
)
SELECT 
  p1.name as partner1,
  p2.name as partner2,
  COUNT(*) as matches_together,
  SUM(won) as wins_together,
  ROUND(SUM(won)::DECIMAL / COUNT(*) * 100, 1) as partnership_win_rate,
  CASE
    WHEN ROUND(SUM(won)::DECIMAL / COUNT(*) * 100, 1) >= 80 THEN '🏆 Legendary'
    WHEN ROUND(SUM(won)::DECIMAL / COUNT(*) * 100, 1) >= 70 THEN '🔥 Excellent' 
    WHEN ROUND(SUM(won)::DECIMAL / COUNT(*) * 100, 1) >= 60 THEN '👍 Good'
    WHEN ROUND(SUM(won)::DECIMAL / COUNT(*) * 100, 1) >= 40 THEN '😐 Average'
    ELSE '👎 Poor'
  END as partnership_rating
FROM partnership_stats ps
JOIN players p1 ON ps.partner1_id = p1.id
JOIN players p2 ON ps.partner2_id = p2.id
GROUP BY p1.id, p1.name, p2.id, p2.name
HAVING COUNT(*) >= 2  -- At least 2 matches together
ORDER BY partnership_win_rate DESC, matches_together DESC;

-- 8. Individual player analysis: best partners and toughest opponents
-- Replace 'TARGET_PLAYER_ID' with actual UUID
SELECT 
  'Best Partners' as category,
  partner_name as other_player,
  matches,
  wins,
  ROUND(win_rate, 1) as win_rate_percent
FROM (
  -- Get partnership stats for target player
  WITH player_partnerships AS (
    SELECT 
      CASE 
        WHEN m.team1_player1_id = 'TARGET_PLAYER_ID' THEN m.team1_player2_id
        WHEN m.team1_player2_id = 'TARGET_PLAYER_ID' THEN m.team1_player1_id
        WHEN m.team2_player1_id = 'TARGET_PLAYER_ID' THEN m.team2_player2_id
        ELSE m.team2_player1_id
      END as partner_id,
      CASE
        WHEN (m.team1_player1_id = 'TARGET_PLAYER_ID' OR m.team1_player2_id = 'TARGET_PLAYER_ID') 
          AND m.winning_team = 1 THEN 1
        WHEN (m.team2_player1_id = 'TARGET_PLAYER_ID' OR m.team2_player2_id = 'TARGET_PLAYER_ID')
          AND m.winning_team = 2 THEN 1
        ELSE 0
      END as won
    FROM matches m
    WHERE m.completed_at IS NOT NULL
      AND m.match_type = 'doubles'
      AND (
        m.team1_player1_id = 'TARGET_PLAYER_ID' OR
        m.team1_player2_id = 'TARGET_PLAYER_ID' OR
        m.team2_player1_id = 'TARGET_PLAYER_ID' OR
        m.team2_player2_id = 'TARGET_PLAYER_ID'
      )
  )
  SELECT 
    p.name as partner_name,
    COUNT(*) as matches,
    SUM(pp.won) as wins,
    SUM(pp.won)::DECIMAL / COUNT(*) * 100 as win_rate
  FROM player_partnerships pp
  JOIN players p ON pp.partner_id = p.id
  WHERE pp.partner_id IS NOT NULL
  GROUP BY p.id, p.name
  HAVING COUNT(*) >= 2
  ORDER BY win_rate DESC
  LIMIT 5
) best_partners

UNION ALL

SELECT 
  'Toughest Opponents' as category,
  opponent_name as other_player,
  matches,
  wins,
  ROUND(win_rate, 1) as win_rate_percent
FROM (
  -- Get head-to-head stats for target player  
  WITH player_opponents AS (
    SELECT 
      CASE
        WHEN m.team1_player1_id = 'TARGET_PLAYER_ID' THEN 
          COALESCE(m.team2_player1_id, m.team2_player2_id)
        WHEN m.team1_player2_id = 'TARGET_PLAYER_ID' THEN
          COALESCE(m.team2_player1_id, m.team2_player2_id) 
        WHEN m.team2_player1_id = 'TARGET_PLAYER_ID' THEN
          COALESCE(m.team1_player1_id, m.team1_player2_id)
        ELSE
          COALESCE(m.team1_player1_id, m.team1_player2_id)
      END as opponent_id,
      CASE
        WHEN (m.team1_player1_id = 'TARGET_PLAYER_ID' OR m.team1_player2_id = 'TARGET_PLAYER_ID')
          AND m.winning_team = 1 THEN 1
        WHEN (m.team2_player1_id = 'TARGET_PLAYER_ID' OR m.team2_player2_id = 'TARGET_PLAYER_ID') 
          AND m.winning_team = 2 THEN 1
        ELSE 0
      END as won
    FROM matches m
    WHERE m.completed_at IS NOT NULL
      AND (
        m.team1_player1_id = 'TARGET_PLAYER_ID' OR
        m.team1_player2_id = 'TARGET_PLAYER_ID' OR
        m.team2_player1_id = 'TARGET_PLAYER_ID' OR  
        m.team2_player2_id = 'TARGET_PLAYER_ID'
      )
  )
  SELECT 
    p.name as opponent_name,
    COUNT(*) as matches,
    SUM(po.won) as wins,
    SUM(po.won)::DECIMAL / COUNT(*) * 100 as win_rate
  FROM player_opponents po
  JOIN players p ON po.opponent_id = p.id
  WHERE po.opponent_id IS NOT NULL
  GROUP BY p.id, p.name
  HAVING COUNT(*) >= 2
  ORDER BY win_rate ASC  -- Lowest win rate = toughest opponents
  LIMIT 5
) toughest_opponents;

-- 9. Session-specific partnership evolution
SELECT 
  s.name as session_name,
  p1.name as partner1,
  p2.name as partner2,
  COUNT(*) as matches_in_session,
  SUM(
    CASE 
      WHEN (m.team1_player1_id IN (p1.id, p2.id) AND m.team1_player2_id IN (p1.id, p2.id) AND m.winning_team = 1) OR
           (m.team2_player1_id IN (p1.id, p2.id) AND m.team2_player2_id IN (p1.id, p2.id) AND m.winning_team = 2)
      THEN 1 ELSE 0
    END
  ) as wins_in_session,
  ROUND(
    SUM(
      CASE 
        WHEN (m.team1_player1_id IN (p1.id, p2.id) AND m.team1_player2_id IN (p1.id, p2.id) AND m.winning_team = 1) OR
             (m.team2_player1_id IN (p1.id, p2.id) AND m.team2_player2_id IN (p1.id, p2.id) AND m.winning_team = 2)
        THEN 1 ELSE 0
      END
    )::DECIMAL / COUNT(*) * 100, 1
  ) as session_win_rate
FROM sessions s
JOIN matches m ON s.id = m.session_id
CROSS JOIN players p1
CROSS JOIN players p2
WHERE m.completed_at IS NOT NULL
  AND m.match_type = 'doubles'
  AND p1.id < p2.id  -- Avoid duplicates
  AND (
    (m.team1_player1_id = p1.id AND m.team1_player2_id = p2.id) OR
    (m.team1_player1_id = p2.id AND m.team1_player2_id = p1.id) OR
    (m.team2_player1_id = p1.id AND m.team2_player2_id = p2.id) OR
    (m.team2_player1_id = p2.id AND m.team2_player2_id = p1.id)
  )
GROUP BY s.id, s.name, p1.id, p1.name, p2.id, p2.name
HAVING COUNT(*) >= 2
ORDER BY s.name, session_win_rate DESC;

-- 10. Player compatibility matrix (who works well together)
CREATE OR REPLACE VIEW partnership_compatibility AS
WITH all_partnerships AS (
  SELECT 
    LEAST(team1_player1_id, team1_player2_id) as player1_id,
    GREATEST(team1_player1_id, team1_player2_id) as player2_id,
    winning_team = 1 as won,
    session_id,
    completed_at
  FROM matches 
  WHERE completed_at IS NOT NULL 
    AND match_type = 'doubles'
    AND team1_player1_id IS NOT NULL 
    AND team1_player2_id IS NOT NULL
    
  UNION ALL
  
  SELECT 
    LEAST(team2_player1_id, team2_player2_id) as player1_id,
    GREATEST(team2_player1_id, team2_player2_id) as player2_id,
    winning_team = 2 as won,
    session_id,
    completed_at
  FROM matches
  WHERE completed_at IS NOT NULL
    AND match_type = 'doubles' 
    AND team2_player1_id IS NOT NULL
    AND team2_player2_id IS NOT NULL
)
SELECT 
  p1.name as player1,
  p2.name as player2,
  COUNT(*) as matches_together,
  SUM(CASE WHEN won THEN 1 ELSE 0 END) as wins_together,
  ROUND(AVG(CASE WHEN won THEN 1.0 ELSE 0.0 END) * 100, 1) as win_rate,
  CASE
    WHEN AVG(CASE WHEN won THEN 1.0 ELSE 0.0 END) >= 0.8 THEN 'Perfect Synergy'
    WHEN AVG(CASE WHEN won THEN 1.0 ELSE 0.0 END) >= 0.7 THEN 'Great Chemistry'  
    WHEN AVG(CASE WHEN won THEN 1.0 ELSE 0.0 END) >= 0.6 THEN 'Good Partnership'
    WHEN AVG(CASE WHEN won THEN 1.0 ELSE 0.0 END) >= 0.4 THEN 'Average Team'
    ELSE 'Poor Chemistry'
  END as chemistry_rating,
  MIN(completed_at) as first_match,
  MAX(completed_at) as last_match
FROM all_partnerships ap
JOIN players p1 ON ap.player1_id = p1.id
JOIN players p2 ON ap.player2_id = p2.id
GROUP BY p1.id, p1.name, p2.id, p2.name
HAVING COUNT(*) >= 2
ORDER BY win_rate DESC, matches_together DESC;
