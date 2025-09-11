// Analytics Service - Advanced player statistics and matchup analysis
// Provides head-to-head, partnership, and performance analytics

import databaseService from './DatabaseService';

class AnalyticsService {
  constructor() {
    this.db = databaseService;
  }

  // Head-to-Head Analysis: Player A vs Player B win rates
  async getHeadToHeadStats(player1Id, player2Id, sessionId = null) {
    const matches = await this.db.getMatches(sessionId);
    const players = await this.db.getPlayers();
    
    const player1 = players.find(p => p.id === player1Id);
    const player2 = players.find(p => p.id === player2Id);
    
    if (!player1 || !player2) {
      throw new Error('One or both players not found');
    }

    // Find all matches where these two players faced each other
    const headToHeadMatches = matches.filter(match => {
      if (!match.completed_at) return false; // Only completed matches
      
      const allPlayerIds = [
        match.team1_player1_id,
        match.team1_player2_id,
        match.team2_player1_id,
        match.team2_player2_id
      ].filter(Boolean);
      
      // Both players must be in the match
      const bothInMatch = allPlayerIds.includes(player1Id) && allPlayerIds.includes(player2Id);
      if (!bothInMatch) return false;
      
      // They must be on opposite teams
      const player1Team = this.getPlayerTeam(match, player1Id);
      const player2Team = this.getPlayerTeam(match, player2Id);
      
      return player1Team !== player2Team; // Opponents, not teammates
    });

    // Calculate win rates
    const player1Wins = headToHeadMatches.filter(match => {
      const player1Team = this.getPlayerTeam(match, player1Id);
      return match.winning_team === player1Team;
    }).length;
    
    const player2Wins = headToHeadMatches.length - player1Wins;
    
    return {
      player1: { id: player1Id, name: player1.name },
      player2: { id: player2Id, name: player2.name },
      totalMatches: headToHeadMatches.length,
      player1Wins,
      player2Wins,
      player1WinRate: headToHeadMatches.length > 0 ? (player1Wins / headToHeadMatches.length) : 0,
      player2WinRate: headToHeadMatches.length > 0 ? (player2Wins / headToHeadMatches.length) : 0,
      matches: headToHeadMatches.map(match => ({
        id: match.id,
        date: match.completed_at,
        winner: match.winning_team === this.getPlayerTeam(match, player1Id) ? player1.name : player2.name,
        matchType: match.match_type,
        sessionId: match.session_id
      }))
    };
  }

  // Partnership Analysis: Player A's win rate when paired with Player B
  async getPartnershipStats(player1Id, player2Id, sessionId = null) {
    const matches = await this.db.getMatches(sessionId);
    const players = await this.db.getPlayers();
    
    const player1 = players.find(p => p.id === player1Id);
    const player2 = players.find(p => p.id === player2Id);
    
    if (!player1 || !player2) {
      throw new Error('One or both players not found');
    }

    // Find all matches where these two players were teammates
    const partnershipMatches = matches.filter(match => {
      if (!match.completed_at) return false; // Only completed matches
      
      // Check if both players are on the same team
      const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
      const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean);
      
      const bothOnTeam1 = team1Players.includes(player1Id) && team1Players.includes(player2Id);
      const bothOnTeam2 = team2Players.includes(player1Id) && team2Players.includes(player2Id);
      
      return bothOnTeam1 || bothOnTeam2;
    });

    // Calculate partnership win rate
    const wins = partnershipMatches.filter(match => {
      const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
      const bothOnTeam1 = team1Players.includes(player1Id) && team1Players.includes(player2Id);
      
      return bothOnTeam1 ? match.winning_team === 1 : match.winning_team === 2;
    }).length;
    
    const losses = partnershipMatches.length - wins;
    
    return {
      player1: { id: player1Id, name: player1.name },
      player2: { id: player2Id, name: player2.name },
      totalMatches: partnershipMatches.length,
      wins,
      losses,
      winRate: partnershipMatches.length > 0 ? (wins / partnershipMatches.length) : 0,
      matches: partnershipMatches.map(match => ({
        id: match.id,
        date: match.completed_at,
        won: this.didPartnershipWin(match, player1Id, player2Id),
        opponents: this.getOpponents(match, player1Id, player2Id, players),
        matchType: match.match_type,
        sessionId: match.session_id
      }))
    };
  }

  // Individual Player Analysis: Win rates against all opponents and with all partners
  async getPlayerMatchupAnalysis(playerId, sessionId = null) {
    const matches = await this.db.getMatches(sessionId);
    const players = await this.db.getPlayers();
    const targetPlayer = players.find(p => p.id === playerId);
    
    if (!targetPlayer) {
      throw new Error('Player not found');
    }

    // Get all completed matches involving this player
    const playerMatches = matches.filter(match => {
      if (!match.completed_at) return false;
      
      const allPlayerIds = [
        match.team1_player1_id,
        match.team1_player2_id,
        match.team2_player1_id,
        match.team2_player2_id
      ].filter(Boolean);
      
      return allPlayerIds.includes(playerId);
    });

    // Head-to-head stats against each opponent
    const opponentStats = {};
    
    // Partnership stats with each teammate
    const partnershipStats = {};
    
    playerMatches.forEach(match => {
      const playerTeam = this.getPlayerTeam(match, playerId);
      const isWinner = match.winning_team === playerTeam;
      
      // Get teammates and opponents
      const { teammates, opponents } = this.getTeammatesAndOpponents(match, playerId, players);
      
      // Track head-to-head stats
      opponents.forEach(opponent => {
        if (!opponentStats[opponent.id]) {
          opponentStats[opponent.id] = {
            player: opponent,
            matches: 0,
            wins: 0,
            losses: 0
          };
        }
        opponentStats[opponent.id].matches++;
        if (isWinner) {
          opponentStats[opponent.id].wins++;
        } else {
          opponentStats[opponent.id].losses++;
        }
      });
      
      // Track partnership stats (only for doubles)
      if (match.match_type === 'doubles') {
        teammates.forEach(teammate => {
          if (!partnershipStats[teammate.id]) {
            partnershipStats[teammate.id] = {
              player: teammate,
              matches: 0,
              wins: 0,
              losses: 0
            };
          }
          partnershipStats[teammate.id].matches++;
          if (isWinner) {
            partnershipStats[teammate.id].wins++;
          } else {
            partnershipStats[teammate.id].losses++;
          }
        });
      }
    });

    // Calculate win rates
    const opponentAnalysis = Object.values(opponentStats).map(stat => ({
      ...stat,
      winRate: stat.wins / stat.matches,
      dominance: (stat.wins - stat.losses) / stat.matches // +1 = always wins, -1 = always loses
    })).sort((a, b) => b.winRate - a.winRate);

    const partnershipAnalysis = Object.values(partnershipStats).map(stat => ({
      ...stat,
      winRate: stat.wins / stat.matches,
      synergy: (stat.wins - stat.losses) / stat.matches // Partnership effectiveness
    })).sort((a, b) => b.winRate - a.winRate);

    return {
      player: targetPlayer,
      totalMatches: playerMatches.length,
      totalWins: playerMatches.filter(m => {
        const playerTeam = this.getPlayerTeam(m, playerId);
        return m.winning_team === playerTeam;
      }).length,
      
      // Head-to-head analysis
      opponentAnalysis,
      bestMatchup: opponentAnalysis[0] || null, // Highest win rate opponent
      worstMatchup: opponentAnalysis[opponentAnalysis.length - 1] || null, // Lowest win rate
      
      // Partnership analysis  
      partnershipAnalysis,
      bestPartner: partnershipAnalysis[0] || null, // Highest win rate partner
      worstPartner: partnershipAnalysis[partnershipAnalysis.length - 1] || null,
      
      // Overall stats
      singlesRecord: this.getMatchTypeRecord(playerMatches, playerId, 'singles'),
      doublesRecord: this.getMatchTypeRecord(playerMatches, playerId, 'doubles')
    };
  }

  // Get all possible player matchups and their statistics
  async getAllMatchupMatrix(sessionId = null) {
    const players = await this.db.getPlayers();
    const matches = await this.db.getMatches(sessionId);
    
    const matrix = {};
    
    // Initialize matrix
    players.forEach(player1 => {
      matrix[player1.id] = {};
      players.forEach(player2 => {
        if (player1.id !== player2.id) {
          matrix[player1.id][player2.id] = {
            player1: player1,
            player2: player2,
            matches: 0,
            player1Wins: 0,
            player2Wins: 0,
            winRate: 0
          };
        }
      });
    });
    
    // Populate matrix with actual match data
    matches.forEach(match => {
      if (!match.completed_at) return;
      
      const allPlayerIds = [
        match.team1_player1_id,
        match.team1_player2_id,
        match.team2_player1_id,
        match.team2_player2_id
      ].filter(Boolean);
      
      // For each pair of opponents in the match
      const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
      const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean);
      
      team1Players.forEach(team1PlayerId => {
        team2Players.forEach(team2PlayerId => {
          if (matrix[team1PlayerId] && matrix[team1PlayerId][team2PlayerId]) {
            matrix[team1PlayerId][team2PlayerId].matches++;
            if (match.winning_team === 1) {
              matrix[team1PlayerId][team2PlayerId].player1Wins++;
            } else {
              matrix[team1PlayerId][team2PlayerId].player2Wins++;
            }
            
            // Update reverse relationship
            if (matrix[team2PlayerId] && matrix[team2PlayerId][team1PlayerId]) {
              matrix[team2PlayerId][team1PlayerId].matches++;
              if (match.winning_team === 2) {
                matrix[team2PlayerId][team1PlayerId].player1Wins++;
              } else {
                matrix[team2PlayerId][team1PlayerId].player2Wins++;
              }
            }
          }
        });
      });
    });
    
    // Calculate win rates
    Object.keys(matrix).forEach(player1Id => {
      Object.keys(matrix[player1Id]).forEach(player2Id => {
        const stats = matrix[player1Id][player2Id];
        stats.winRate = stats.matches > 0 ? stats.player1Wins / stats.matches : 0;
      });
    });
    
    return matrix;
  }

  // Get partnership matrix for all player combinations
  async getPartnershipMatrix(sessionId = null) {
    const players = await this.db.getPlayers();
    const matches = await this.db.getMatches(sessionId);
    
    const matrix = {};
    
    // Initialize matrix
    players.forEach(player1 => {
      matrix[player1.id] = {};
      players.forEach(player2 => {
        if (player1.id !== player2.id) {
          matrix[player1.id][player2.id] = {
            player1: player1,
            player2: player2,
            matches: 0,
            wins: 0,
            losses: 0,
            winRate: 0
          };
        }
      });
    });
    
    // Populate with doubles match data
    matches.forEach(match => {
      if (!match.completed_at || match.match_type !== 'doubles') return;
      
      // Check team 1 partnership
      if (match.team1_player1_id && match.team1_player2_id) {
        const p1 = match.team1_player1_id;
        const p2 = match.team1_player2_id;
        
        [matrix[p1]?.[p2], matrix[p2]?.[p1]].forEach(partnership => {
          if (partnership) {
            partnership.matches++;
            if (match.winning_team === 1) {
              partnership.wins++;
            } else {
              partnership.losses++;
            }
          }
        });
      }
      
      // Check team 2 partnership
      if (match.team2_player1_id && match.team2_player2_id) {
        const p1 = match.team2_player1_id;
        const p2 = match.team2_player2_id;
        
        [matrix[p1]?.[p2], matrix[p2]?.[p1]].forEach(partnership => {
          if (partnership) {
            partnership.matches++;
            if (match.winning_team === 2) {
              partnership.wins++;
            } else {
              partnership.losses++;
            }
          }
        });
      }
    });
    
    // Calculate win rates
    Object.keys(matrix).forEach(player1Id => {
      Object.keys(matrix[player1Id]).forEach(player2Id => {
        const stats = matrix[player1Id][player2Id];
        stats.winRate = stats.matches > 0 ? stats.wins / stats.matches : 0;
      });
    });
    
    return matrix;
  }

  // Get comprehensive player performance report
  async getPlayerPerformanceReport(playerId, sessionId = null) {
    const players = await this.db.getPlayers();
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
      throw new Error('Player not found');
    }

    // Get all matchup data for this player
    const headToHeadData = {};
    const partnershipData = {};
    
    for (const otherPlayer of players) {
      if (otherPlayer.id === playerId) continue;
      
      // Head-to-head stats
      try {
        const headToHead = await this.getHeadToHeadStats(playerId, otherPlayer.id, sessionId);
        if (headToHead.totalMatches > 0) {
          headToHeadData[otherPlayer.id] = headToHead;
        }
      } catch (error) {
        // Skip if no matches found
      }
      
      // Partnership stats
      try {
        const partnership = await this.getPartnershipStats(playerId, otherPlayer.id, sessionId);
        if (partnership.totalMatches > 0) {
          partnershipData[otherPlayer.id] = partnership;
        }
      } catch (error) {
        // Skip if no partnerships found
      }
    }
    
    // Analyze performance patterns
    const headToHeadStats = Object.values(headToHeadData);
    const partnershipStats = Object.values(partnershipData);
    
    return {
      player,
      headToHead: {
        totalOpponents: headToHeadStats.length,
        bestMatchup: headToHeadStats.sort((a, b) => b.player1WinRate - a.player1WinRate)[0],
        worstMatchup: headToHeadStats.sort((a, b) => a.player1WinRate - b.player1WinRate)[0],
        averageWinRate: headToHeadStats.reduce((sum, h2h) => sum + h2h.player1WinRate, 0) / Math.max(headToHeadStats.length, 1),
        allMatchups: headToHeadStats.sort((a, b) => b.player1WinRate - a.player1WinRate)
      },
      partnerships: {
        totalPartners: partnershipStats.length,
        bestPartner: partnershipStats.sort((a, b) => b.winRate - a.winRate)[0],
        worstPartner: partnershipStats.sort((a, b) => a.winRate - b.winRate)[0],
        averageWinRate: partnershipStats.reduce((sum, p) => sum + p.winRate, 0) / Math.max(partnershipStats.length, 1),
        allPartnerships: partnershipStats.sort((a, b) => b.winRate - a.winRate)
      }
    };
  }

  // Helper functions
  getPlayerTeam(match, playerId) {
    const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
    const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean);
    
    if (team1Players.includes(playerId)) return 1;
    if (team2Players.includes(playerId)) return 2;
    return null;
  }

  getTeammatesAndOpponents(match, playerId, players) {
    const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
    const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean);
    
    let teammates = [];
    let opponents = [];
    
    if (team1Players.includes(playerId)) {
      teammates = team1Players.filter(id => id !== playerId).map(id => players.find(p => p.id === id)).filter(Boolean);
      opponents = team2Players.map(id => players.find(p => p.id === id)).filter(Boolean);
    } else if (team2Players.includes(playerId)) {
      teammates = team2Players.filter(id => id !== playerId).map(id => players.find(p => p.id === id)).filter(Boolean);
      opponents = team1Players.map(id => players.find(p => p.id === id)).filter(Boolean);
    }
    
    return { teammates, opponents };
  }

  getOpponents(match, player1Id, player2Id, players) {
    const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
    const team2Players = [match.team2_player1_id, match.team2_player2_id].filter(Boolean);
    
    const bothOnTeam1 = team1Players.includes(player1Id) && team1Players.includes(player2Id);
    const opponentIds = bothOnTeam1 ? team2Players : team1Players;
    
    return opponentIds.map(id => players.find(p => p.id === id)).filter(Boolean);
  }

  didPartnershipWin(match, player1Id, player2Id) {
    const team1Players = [match.team1_player1_id, match.team1_player2_id].filter(Boolean);
    const bothOnTeam1 = team1Players.includes(player1Id) && team1Players.includes(player2Id);
    
    return bothOnTeam1 ? match.winning_team === 1 : match.winning_team === 2;
  }

  getMatchTypeRecord(matches, playerId, matchType) {
    const typeMatches = matches.filter(m => m.match_type === matchType && m.completed_at);
    const wins = typeMatches.filter(match => {
      const playerTeam = this.getPlayerTeam(match, playerId);
      return match.winning_team === playerTeam;
    }).length;
    
    return {
      matches: typeMatches.length,
      wins,
      losses: typeMatches.length - wins,
      winRate: typeMatches.length > 0 ? wins / typeMatches.length : 0
    };
  }

  // Advanced analytics queries
  async getPlayerTierAnalysis(playerId, sessionId = null) {
    const playerReport = await this.getPlayerPerformanceReport(playerId, sessionId);
    const players = await this.db.getPlayers();
    
    // Analyze performance against different skill tiers
    const tierPerformance = {
      'vs_higher_elo': { matches: 0, wins: 0, winRate: 0 },
      'vs_similar_elo': { matches: 0, wins: 0, winRate: 0 },
      'vs_lower_elo': { matches: 0, wins: 0, winRate: 0 }
    };
    
    const playerElo = playerReport.player.current_elo;
    
    playerReport.headToHead.allMatchups.forEach(matchup => {
      const opponentElo = players.find(p => p.id === matchup.player2.id)?.current_elo || 1200;
      const eloDiff = opponentElo - playerElo;
      
      let tier;
      if (eloDiff > 50) tier = 'vs_higher_elo';
      else if (eloDiff < -50) tier = 'vs_lower_elo';
      else tier = 'vs_similar_elo';
      
      tierPerformance[tier].matches += matchup.totalMatches;
      tierPerformance[tier].wins += matchup.player1Wins;
    });
    
    // Calculate win rates
    Object.keys(tierPerformance).forEach(tier => {
      const data = tierPerformance[tier];
      data.winRate = data.matches > 0 ? data.wins / data.matches : 0;
    });
    
    return {
      player: playerReport.player,
      tierPerformance,
      skillLevel: this.determineSkillLevel(tierPerformance),
      improvement: this.analyzeImprovement(playerReport.player.id, sessionId)
    };
  }

  determineSkillLevel(tierPerformance) {
    const vsHigher = tierPerformance.vs_higher_elo.winRate;
    const vsSimilar = tierPerformance.vs_similar_elo.winRate;
    const vsLower = tierPerformance.vs_lower_elo.winRate;
    
    if (vsHigher > 0.4 && vsSimilar > 0.5 && vsLower > 0.7) {
      return 'advancing'; // Performing above expected level
    } else if (vsHigher < 0.2 && vsSimilar < 0.4 && vsLower < 0.6) {
      return 'struggling'; // Performing below expected level
    } else {
      return 'stable'; // Performing at expected level
    }
  }

  async analyzeImprovement(playerId, sessionId = null) {
    const eloHistory = await this.db.getEloHistory(playerId, sessionId);
    
    if (eloHistory.length < 5) {
      return { trend: 'insufficient_data', change: 0 };
    }
    
    const recent = eloHistory.slice(-10);
    const older = eloHistory.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, eh) => sum + eh.elo_after, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, eh) => sum + eh.elo_after, 0) / older.length : recentAvg;
    
    const change = recentAvg - olderAvg;
    
    return {
      trend: change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable',
      change: Math.round(change),
      recentAverage: Math.round(recentAvg),
      previousAverage: Math.round(olderAvg)
    };
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;
