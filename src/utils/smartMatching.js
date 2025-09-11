// Smart Matching System for Badminton Pairing
// Implements intelligent player selection based on skill levels and match history

import { calculateTeamELO } from './helpers';

// Configuration for smart matching algorithm
export const SMART_MATCHING_CONFIG = {
  // ELO difference tolerances
  MAX_ELO_DIFF: 500,          // Maximum ELO difference between players
  IDEAL_ELO_DIFF: 200,        // Ideal ELO difference for balanced matches
  TEAM_ELO_TOLERANCE: 250,    // Maximum team ELO difference
  
  // Partnership tracking
  MAX_REPEATED_PARTNERSHIPS: 2, // How many times same partnership is allowed
  PARTNERSHIP_MEMORY: 5,        // How many recent matches to consider
  
  // Matching weights (sum should equal 1.0)
  WEIGHTS: {
    ELO_BALANCE: 0.4,          // Weight for ELO balance between teams
    SKILL_SIMILARITY: 0.3,     // Weight for similar skill levels
    PARTNERSHIP_VARIETY: 0.2,  // Weight for partnership variety
    OPPONENT_VARIETY: 0.1      // Weight for opponent variety
  }
};

/**
 * Calculate team ELO from two players
 */
function getTeamELO(player1, player2) {
  const elo1 = player1.sessionElo || player1.elo || 1200;
  const elo2 = player2.sessionElo || player2.elo || 1200;
  return calculateTeamELO(elo1, elo2);
}

/**
 * Get partnership history between two players
 */
function getPartnershipHistory(player1, player2, matches) {
  let partnerships = 0;
  let recentPartnerships = 0;
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match.completed) continue;
    
    // Check if these two players were partners
    const team1Partners = (match.team1.player1?.id === player1.id && match.team1.player2?.id === player2.id) ||
                         (match.team1.player1?.id === player2.id && match.team1.player2?.id === player1.id);
    
    const team2Partners = (match.team2.player1?.id === player1.id && match.team2.player2?.id === player2.id) ||
                         (match.team2.player1?.id === player2.id && match.team2.player2?.id === player1.id);
    
    if (team1Partners || team2Partners) {
      partnerships++;
      if (i < SMART_MATCHING_CONFIG.PARTNERSHIP_MEMORY) {
        recentPartnerships++;
      }
    }
  }
  
  return { total: partnerships, recent: recentPartnerships };
}

/**
 * Get opponent history between two players
 */
function getOpponentHistory(player1, player2, matches) {
  let oppositions = 0;
  let recentOppositions = 0;
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match.completed) continue;
    
    // Check if these players were opponents
    const team1Has1 = match.team1.player1?.id === player1.id || match.team1.player2?.id === player1.id;
    const team1Has2 = match.team1.player1?.id === player2.id || match.team1.player2?.id === player2.id;
    const team2Has1 = match.team2.player1?.id === player1.id || match.team2.player2?.id === player1.id;
    const team2Has2 = match.team2.player1?.id === player2.id || match.team2.player2?.id === player2.id;
    
    const wereOpponents = (team1Has1 && team2Has2) || (team2Has1 && team1Has2);
    
    if (wereOpponents) {
      oppositions++;
      if (i < SMART_MATCHING_CONFIG.PARTNERSHIP_MEMORY) {
        recentOppositions++;
      }
    }
  }
  
  return { total: oppositions, recent: recentOppositions };
}

/**
 * Calculate match quality score for a potential match
 * Higher score = better match
 */
function calculateMatchScore(team1Player1, team1Player2, team2Player1, team2Player2, matches) {
  // Calculate team ELOs
  const team1ELO = getTeamELO(team1Player1, team1Player2);
  const team2ELO = getTeamELO(team2Player1, team2Player2);
  
  // Calculate scores for each criteria (0-1 scale, higher is better)
  
  // 1. ELO Balance Score - penalize large team ELO differences
  const eloDiff = Math.abs(team1ELO - team2ELO);
  const eloBalanceScore = Math.max(0, 1 - (eloDiff / SMART_MATCHING_CONFIG.TEAM_ELO_TOLERANCE));
  
  // 2. Skill Similarity Score - prefer players of similar skill levels
  const allPlayers = [team1Player1, team1Player2, team2Player1, team2Player2];
  const elos = allPlayers.map(p => p.sessionElo || p.elo || 1200);
  const avgELO = elos.reduce((a, b) => a + b, 0) / elos.length;
  const skillVariance = elos.reduce((sum, elo) => sum + Math.pow(elo - avgELO, 2), 0) / elos.length;
  const skillSimilarityScore = Math.max(0, 1 - (Math.sqrt(skillVariance) / SMART_MATCHING_CONFIG.MAX_ELO_DIFF));
  
  // 3. Partnership Variety Score - penalize repeated partnerships
  const partnerships = [
    getPartnershipHistory(team1Player1, team1Player2, matches),
    getPartnershipHistory(team2Player1, team2Player2, matches)
  ];
  const maxRecentPartnerships = Math.max(...partnerships.map(p => p.recent));
  const partnershipVarietyScore = Math.max(0, 1 - (maxRecentPartnerships / SMART_MATCHING_CONFIG.MAX_REPEATED_PARTNERSHIPS));
  
  // 4. Opponent Variety Score - reward facing different opponents
  const oppositions = [
    getOpponentHistory(team1Player1, team2Player1, matches),
    getOpponentHistory(team1Player1, team2Player2, matches),
    getOpponentHistory(team1Player2, team2Player1, matches),
    getOpponentHistory(team1Player2, team2Player2, matches)
  ];
  const avgRecentOppositions = oppositions.reduce((sum, opp) => sum + opp.recent, 0) / oppositions.length;
  const opponentVarietyScore = Math.max(0, 1 - (avgRecentOppositions / SMART_MATCHING_CONFIG.PARTNERSHIP_MEMORY));
  
  // Calculate weighted total score
  const weights = SMART_MATCHING_CONFIG.WEIGHTS;
  const totalScore = 
    eloBalanceScore * weights.ELO_BALANCE +
    skillSimilarityScore * weights.SKILL_SIMILARITY +
    partnershipVarietyScore * weights.PARTNERSHIP_VARIETY +
    opponentVarietyScore * weights.OPPONENT_VARIETY;
  
  return {
    total: totalScore,
    breakdown: {
      eloBalance: eloBalanceScore,
      skillSimilarity: skillSimilarityScore,
      partnershipVariety: partnershipVarietyScore,
      opponentVariety: opponentVarietyScore
    },
    teamELOs: { team1: team1ELO, team2: team2ELO }
  };
}

/**
 * Generate all possible team combinations from 4 players
 */
function generateTeamCombinations(players) {
  if (players.length !== 4) return [];
  
  const [p1, p2, p3, p4] = players;
  
  // All possible ways to divide 4 players into 2 teams of 2
  return [
    // p1+p2 vs p3+p4
    {
      team1: { player1: p1, player2: p2 },
      team2: { player1: p3, player2: p4 }
    },
    // p1+p3 vs p2+p4
    {
      team1: { player1: p1, player2: p3 },
      team2: { player1: p2, player2: p4 }
    },
    // p1+p4 vs p2+p3
    {
      team1: { player1: p1, player2: p4 },
      team2: { player1: p2, player2: p3 }
    }
  ];
}

/**
 * Smart player selection algorithm
 * Selects best 4 players and optimal team arrangement
 */
export function selectSmartPlayers(availablePlayers, matches, courtNumber = 0) {
  if (availablePlayers.length < 4) {
    return null; // Not enough players
  }
  
  let bestSelection = null;
  let bestScore = -1;
  
  // Try different combinations of 4 players
  for (let i = 0; i < availablePlayers.length - 3; i++) {
    for (let j = i + 1; j < availablePlayers.length - 2; j++) {
      for (let k = j + 1; k < availablePlayers.length - 1; k++) {
        for (let l = k + 1; l < availablePlayers.length; l++) {
          const playerGroup = [
            availablePlayers[i],
            availablePlayers[j],
            availablePlayers[k],
            availablePlayers[l]
          ];
          
          // Generate all team combinations for this player group
          const teamCombinations = generateTeamCombinations(playerGroup);
          
          // Find the best team arrangement for this player group
          for (const combination of teamCombinations) {
            const score = calculateMatchScore(
              combination.team1.player1,
              combination.team1.player2,
              combination.team2.player1,
              combination.team2.player2,
              matches
            );
            
            if (score.total > bestScore) {
              bestScore = score.total;
              bestSelection = {
                players: playerGroup,
                teams: combination,
                score: score
              };
            }
          }
        }
      }
    }
  }
  
  return bestSelection;
}

/**
 * Fallback to random selection if smart matching fails
 */
export function selectRandomPlayers(availablePlayers) {
  if (availablePlayers.length < 4) return null;
  
  const shuffled = [...availablePlayers].sort(() => Math.random() - 0.5);
  const selectedPlayers = shuffled.slice(0, 4);
  
  return {
    players: selectedPlayers,
    teams: {
      team1: { player1: selectedPlayers[0], player2: selectedPlayers[1] },
      team2: { player1: selectedPlayers[2], player2: selectedPlayers[3] }
    },
    score: { total: 0, breakdown: {}, teamELOs: {} },
    method: 'random'
  };
}

/**
 * Main smart matching function
 * Returns best player selection with optimal team arrangement
 */
export function generateSmartMatch(availablePlayers, matches, useSmartMatching = true) {
  if (!useSmartMatching) {
    return selectRandomPlayers(availablePlayers);
  }
  
  const smartSelection = selectSmartPlayers(availablePlayers, matches);
  
  // Fallback to random if smart matching fails
  if (!smartSelection) {
    return selectRandomPlayers(availablePlayers);
  }
  
  return {
    ...smartSelection,
    method: 'smart'
  };
}

/**
 * Get match preview information for UI display
 */
export function getMatchPreview(team1Player1, team1Player2, team2Player1, team2Player2) {
  const team1ELO = getTeamELO(team1Player1, team1Player2);
  const team2ELO = getTeamELO(team2Player1, team2Player2);
  const eloDiff = Math.abs(team1ELO - team2ELO);
  
  let balanceLabel = 'Balanced';
  if (eloDiff > 200) balanceLabel = 'Unbalanced';
  if (eloDiff > 400) balanceLabel = 'Very Unbalanced';
  if (eloDiff < 100) balanceLabel = 'Very Balanced';
  
  return {
    team1ELO: Math.round(team1ELO),
    team2ELO: Math.round(team2ELO),
    eloDifference: Math.round(eloDiff),
    balanceLabel,
    isBalanced: eloDiff <= SMART_MATCHING_CONFIG.TEAM_ELO_TOLERANCE
  };
}
