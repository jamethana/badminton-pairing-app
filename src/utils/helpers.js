// Generate a unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Shuffle array using Fisher-Yates algorithm
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get time ago from timestamp
export function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now - time) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
}

// Advanced ELO Rating System
export const ELO_CONFIG = {
  STARTING_ELO: 1200,        // Standard starting ELO
  MIN_ELO: 100,              // Minimum possible ELO
  MAX_ELO: 3000,             // Maximum possible ELO
  K_FACTOR_BASE: 32,         // Base K-factor for ELO changes
  K_FACTOR_NEW_PLAYER: 120,   // Higher K-factor for new players (first 10 matches)
  K_FACTOR_EXPERIENCED: 16,  // Lower K-factor for experienced players (>100 matches)
  CALIBRATION_MATCHES: 10,   // Number of matches considered calibration period
  EXPERIENCED_MATCHES: 100   // Number of matches to be considered experienced
};

/**
 * Calculate expected score using standard ELO formula
 * @param {number} playerELO - Player's current ELO
 * @param {number} opponentELO - Opponent's ELO (or average for team)
 * @returns {number} Expected score between 0 and 1
 */
export function calculateExpectedScore(playerELO, opponentELO) {
  const eloDifference = opponentELO - playerELO;
  return 1 / (1 + Math.pow(10, eloDifference / 400));
}

/**
 * Calculate team ELO for doubles matches
 * @param {number} player1ELO - First player's ELO
 * @param {number} player2ELO - Second player's ELO
 * @returns {number} Team ELO (weighted average)
 */
export function calculateTeamELO(player1ELO, player2ELO) {
  // Simple average for now, could be weighted based on matches played
  return Math.round((player1ELO + player2ELO) / 2);
}

/**
 * Calculate dynamic K-factor based on player experience and confidence
 * @param {number} matchCount - Total matches played
 * @param {number} confidence - Player's confidence rating (0-1)
 * @returns {number} K-factor for ELO calculation
 */
export function calculateKFactor(matchCount, confidence = 1.0) {
  let kFactor;
  
  if (matchCount < ELO_CONFIG.CALIBRATION_MATCHES) {
    // New players: higher volatility
    kFactor = ELO_CONFIG.K_FACTOR_NEW_PLAYER;
  } else if (matchCount > ELO_CONFIG.EXPERIENCED_MATCHES) {
    // Experienced players: lower volatility
    kFactor = ELO_CONFIG.K_FACTOR_EXPERIENCED;
  } else {
    // Regular players: standard volatility
    kFactor = ELO_CONFIG.K_FACTOR_BASE;
  }
  
  // Adjust based on confidence (lower confidence = higher volatility)
  kFactor = kFactor * (2 - confidence);
  
  return Math.round(kFactor);
}

/**
 * Calculate ELO change for a match result
 * @param {Object} params - Match parameters
 * @param {number} params.playerELO - Player's current ELO
 * @param {number} params.opponentELO - Opponent's ELO (team ELO for doubles)
 * @param {boolean} params.isWin - Whether the player won
 * @param {number} params.matchCount - Player's total match count
 * @param {number} params.confidence - Player's confidence rating (optional)
 * @returns {Object} {newELO, eloChange, expectedScore}
 */
export function calculateELOChange({ playerELO, opponentELO, isWin, matchCount, confidence = 1.0 }) {
  const expectedScore = calculateExpectedScore(playerELO, opponentELO);
  const actualScore = isWin ? 1 : 0;
  const kFactor = calculateKFactor(matchCount, confidence);
  
  const eloChange = Math.round(kFactor * (actualScore - expectedScore));
  const newELO = Math.max(ELO_CONFIG.MIN_ELO, Math.min(ELO_CONFIG.MAX_ELO, playerELO + eloChange));
  
  return {
    newELO,
    eloChange,
    expectedScore: Math.round(expectedScore * 100) / 100, // Round to 2 decimal places
    kFactor
  };
}

/**
 * Update player's confidence based on match activity
 * Confidence remains stable and only changes based on performance patterns, not time
 * @param {number} currentConfidence - Current confidence rating
 * @returns {number} Current confidence rating (unchanged by time)
 */
export function updateConfidence(currentConfidence = 1.0) {
  // Confidence is now purely performance-based, not time-based
  // It maintains its current value and only changes through match outcomes
  return Math.max(0.5, Math.min(1.0, currentConfidence));
}

/**
 * Calculate initial ELO for existing players (backward compatibility)
 * @param {number} wins - Number of wins
 * @param {number} losses - Number of losses
 * @returns {number} Estimated ELO based on win/loss record
 */
export function calculateInitialELO(wins = 0, losses = 0) {
  if (wins === 0 && losses === 0) {
    return ELO_CONFIG.STARTING_ELO;
  }
  
  // Estimate ELO based on win rate
  const totalMatches = wins + losses;
  const winRate = wins / totalMatches;
  
  // Convert win rate to ELO (approximate)
  // 50% win rate = starting ELO, each 10% = ~100 ELO points
  const estimatedELO = ELO_CONFIG.STARTING_ELO + ((winRate - 0.5) * 1000);
  
  return Math.max(ELO_CONFIG.MIN_ELO, Math.min(ELO_CONFIG.MAX_ELO, Math.round(estimatedELO)));
}

/**
 * Legacy function for backward compatibility - now uses proper ELO calculation
 * @param {number} currentELO - Current ELO rating
 * @param {boolean} isWin - Whether the match was won
 * @param {number} opponentELO - Opponent's ELO (defaults to starting ELO)
 * @param {number} matchCount - Player's match count (defaults to 50)
 * @returns {number} New ELO rating
 */
export function updateELO(currentELO, isWin, opponentELO = ELO_CONFIG.STARTING_ELO, matchCount = 50) {
  const result = calculateELOChange({
    playerELO: currentELO,
    opponentELO,
    isWin,
    matchCount
  });
  return result.newELO;
}

/**
 * Get ELO tier/rank name based on ELO score
 * Updated for new ELO system (starting at 1200)
 * @param {number} elo - Player's ELO rating
 * @returns {Object} Tier information with name, color, and icon
 */
export function getELOTier(elo, player = null) {
  // Check if player is in calibration period
  if (player) {
    const totalMatches = (player.wins || 0) + (player.losses || 0);
    if (totalMatches < ELO_CONFIG.CALIBRATION_MATCHES) {
      return { name: 'Calibrating', color: '#9B59B6', icon: '⚡' };
    }
  }
  
  if (elo >= 2500) return { name: 'Grandmaster', color: '#FFD700', icon: '👑' };
  if (elo >= 2000) return { name: 'Master', color: '#FF6B6B', icon: '🔥' };
  if (elo >= 1800) return { name: 'Elite', color: '#4ECDC4', icon: '⭐' };
  if (elo >= 1600) return { name: 'Expert', color: '#45B7D1', icon: '🎯' };
  if (elo >= 1400) return { name: 'Advanced', color: '#96CEB4', icon: '🌟' };
  if (elo >= 1200) return { name: 'Intermediate', color: '#F39C12', icon: '📈' };
  if (elo >= 1000) return { name: 'Beginner', color: '#F1B40F', icon: '🌱' };
  if (elo >= 500) return { name: 'Novice', color: '#E67E22', icon: '📚' };
  if (elo >= 200) return { name: 'Child', color: '#DDA0DD', icon: '🥚' };
  return { name: 'Unrated', color: '#95A5A6', icon: '❓' };
}

/**
 * Format ELO display for a player (handles calibration period)
 * @param {Object} player - Player object with ELO and match history
 * @param {boolean} useSessionELO - Whether to use session ELO instead of global
 * @returns {string} Formatted ELO display
 */
export function formatELODisplay(player, useSessionELO = false) {
  if (!player) return 'TBD';
  
  const totalMatches = (player.wins || 0) + (player.losses || 0);
  const sessionMatches = (player.sessionWins || 0) + (player.sessionLosses || 0);
  
  // Check if in calibration period
  if (useSessionELO) {
    // For session ELO, show TBD if fewer than calibration matches in session
    if (sessionMatches < ELO_CONFIG.CALIBRATION_MATCHES) {
      return 'TBD';
    }
    return Math.round(player.sessionElo || calculateInitialELO(player.sessionWins || 0, player.sessionLosses || 0)).toString();
  } else {
    // For global ELO, show TBD if fewer than calibration matches overall
    if (totalMatches < ELO_CONFIG.CALIBRATION_MATCHES) {
      return 'TBD';
    }
    return Math.round(player.elo || calculateInitialELO(player.wins || 0, player.losses || 0)).toString();
  }
}

/**
 * Format team ELO display (handles calibration period for team members)
 * @param {Object} player1 - First team player
 * @param {Object} player2 - Second team player
 * @param {boolean} useSessionELO - Whether to use session ELO instead of global
 * @returns {string} Formatted team ELO display
 */
export function formatTeamELODisplay(player1, player2, useSessionELO = false) {
  if (!player1 || !player2) return 'TBD';
  
  // Check if any team member is in calibration
  const player1Matches = useSessionELO 
    ? (player1.sessionWins || 0) + (player1.sessionLosses || 0)
    : (player1.wins || 0) + (player1.losses || 0);
  const player2Matches = useSessionELO 
    ? (player2.sessionWins || 0) + (player2.sessionLosses || 0)
    : (player2.wins || 0) + (player2.losses || 0);
  
  // // If any player is calibrating, show TBD for team
  // if (player1Matches < ELO_CONFIG.CALIBRATION_MATCHES || player2Matches < ELO_CONFIG.CALIBRATION_MATCHES) {
  //   return 'TBD';
  // }
  
  // Calculate team ELO normally
  const player1ELO = useSessionELO 
    ? (player1.sessionElo || calculateInitialELO(player1.sessionWins || 0, player1.sessionLosses || 0))
    : (player1.elo || calculateInitialELO(player1.wins || 0, player1.losses || 0));
  const player2ELO = useSessionELO 
    ? (player2.sessionElo || calculateInitialELO(player2.sessionWins || 0, player2.sessionLosses || 0))
    : (player2.elo || calculateInitialELO(player2.wins || 0, player2.losses || 0));
  
  const teamELO = calculateTeamELO(player1ELO, player2ELO);
  return Math.round(teamELO).toString();
}

// URL utilities for session names
export function sessionNameToUrl(sessionName) {
  return sessionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function urlToSessionName(urlName, sessions) {
  // Validate inputs
  if (!urlName || !sessions || !Array.isArray(sessions)) {
    return null;
  }

  const normalizedUrlName = urlName.toLowerCase().trim();
  
  // Find session that matches the URL format
  const matchedSession = sessions.find(s => {
    if (!s || !s.name) return false;
    
    try {
      const sessionUrl = sessionNameToUrl(s.name);
      return sessionUrl === normalizedUrlName;
    } catch (error) {
      console.warn('Error converting session name to URL:', error);
      return false;
    }
  });

  return matchedSession || null;
}

// Sort players by ELO (highest first)
export function sortPlayersByELO(players, useSession = false) {
  return [...players].sort((a, b) => {
    let eloA, eloB;
    
    if (useSession) {
      // Use session ELO
      eloA = a.sessionElo || calculateInitialELO(a.sessionWins || 0, a.sessionLosses || 0);
      eloB = b.sessionElo || calculateInitialELO(b.sessionWins || 0, b.sessionLosses || 0);
    } else {
      // Use lifetime ELO
      eloA = a.elo || calculateInitialELO(a.wins || 0, a.losses || 0);
      eloB = b.elo || calculateInitialELO(b.wins || 0, b.losses || 0);
    }
    
    return eloB - eloA;
  });
}

// Initialize session stats for a player
export function initializeSessionStats() {
  return {
    sessionWins: 0,
    sessionLosses: 0,
    sessionMatchCount: 0,
    sessionLastMatchTime: null
  };
}

// Sort players by wins (highest first) for session view
export function sortPlayersByWins(players) {
  return [...players].sort((a, b) => {
    const winsA = a.sessionWins || 0;
    const winsB = b.sessionWins || 0;
    
    // Primary sort by wins
    if (winsB !== winsA) {
      return winsB - winsA;
    }
    
    // Secondary sort by losses (fewer losses is better)
    const lossesA = a.sessionLosses || 0;
    const lossesB = b.sessionLosses || 0;
    if (lossesA !== lossesB) {
      return lossesA - lossesB;
    }
    
    // Tertiary sort by name for consistency
    return a.name.localeCompare(b.name);
  });
}

// Session Management
export function createNewSession(name) {
  const sessionId = generateId();
  const courtStates = [];
  
  // Initialize 4 default courts
  for (let i = 0; i < 4; i++) {
    courtStates.push({
      id: i,
      isOccupied: false,
      currentMatch: null
    });
  }
  
  return {
    id: sessionId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    playerIds: [], // IDs of players invited to this session
    courtCount: 4,
    currentMatches: [],
    courtStates: courtStates,
    // Smart matching settings
    smartMatching: {
      enabled: false, // Start with smart matching disabled
      eloRange: 500,  // Maximum ELO difference for matching
      teamBalance: 250, // Maximum team ELO difference
      varietyWeight: 0.2 // How much to weight partnership variety
    }
  };
}

export function getSessionPlayerStats(globalPlayer, sessionId) {
  const sessionStats = globalPlayer.sessionStats?.[sessionId];
  return sessionStats || initializeSessionStats();
}

export function updateSessionPlayerStats(globalPlayer, sessionId, updates) {
  return {
    ...globalPlayer,
    sessionStats: {
      ...globalPlayer.sessionStats,
      [sessionId]: {
        ...getSessionPlayerStats(globalPlayer, sessionId),
        ...updates
      }
    }
  };
} 