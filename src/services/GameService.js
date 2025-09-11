// Game Service Layer - Business logic for badminton game management
// Uses DatabaseService for persistence, contains game rules and logic

import databaseService from './DatabaseService';
import { updateELO, calculateInitialELO, calculateELOChange } from '../utils/helpers';

class GameService {
  constructor() {
    this.db = databaseService;
  }

  // Player management
  async createPlayer(name, email = null) {
    // Check for duplicate names
    const existingPlayers = await this.db.getPlayers();
    const duplicate = existingPlayers.find(p => 
      p.name.toLowerCase() === name.toLowerCase()
    );
    
    if (duplicate) {
      throw new Error('Player name already exists');
    }
    
    return await this.db.createPlayer({ name, email });
  }

  async getPlayerWithSessionStats(playerId, sessionId) {
    const players = await this.db.getPlayers();
    const player = players.find(p => p.id === playerId);
    if (!player) return null;
    
    const sessionPlayers = await this.db.getSessionPlayers(sessionId);
    const sessionPlayer = sessionPlayers.find(sp => sp.player_id === playerId);
    
    return {
      ...player,
      sessionStats: sessionPlayer || {
        session_matches: 0,
        session_wins: 0,
        session_losses: 0,
        session_elo_current: 1200,
        is_active_in_session: true
      }
    };
  }

  async getAvailablePlayers(excludeSessionId = null) {
    const players = await this.db.getPlayers();
    
    if (!excludeSessionId) return players;
    
    // Get players not in the specified session
    const sessionPlayers = await this.db.getSessionPlayers(excludeSessionId);
    const sessionPlayerIds = sessionPlayers
      .filter(sp => sp.is_active_in_session)
      .map(sp => sp.player_id);
    
    return players.filter(p => !sessionPlayerIds.includes(p.id));
  }

  // Session management
  async createSession(name, description = null) {
    return await this.db.createSession({ name, description });
  }

  async getSessionWithPlayers(sessionId) {
    const sessions = await this.db.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return null;
    
    const sessionPlayers = await this.db.getSessionPlayers(sessionId);
    const players = await this.db.getPlayers();
    
    const sessionPlayersWithData = sessionPlayers
      .filter(sp => sp.is_active_in_session)
      .map(sp => {
        const player = players.find(p => p.id === sp.player_id);
        return player ? {
          ...player,
          sessionWins: sp.session_wins,
          sessionLosses: sp.session_losses,
          sessionMatchCount: sp.session_matches,
          sessionElo: sp.session_elo_current,
          isActive: sp.is_active_in_session
        } : null;
      })
      .filter(Boolean);
    
    return {
      ...session,
      players: sessionPlayersWithData
    };
  }

  async addPlayerToSession(sessionId, playerId) {
    // Check if player is already in another active session
    const allSessionPlayers = await this.db.get('session_players', []);
    const playerInOtherSession = allSessionPlayers.find(sp => 
      sp.player_id === playerId && 
      sp.session_id !== sessionId && 
      sp.is_active_in_session
    );
    
    if (playerInOtherSession) {
      const sessions = await this.db.getSessions();
      const otherSession = sessions.find(s => s.id === playerInOtherSession.session_id);
      throw new Error(`Player is already in session: ${otherSession?.name || 'Unknown'}`);
    }
    
    return await this.db.addPlayerToSession(sessionId, playerId);
  }

  // Match management
  async createMatch(sessionId, courtNumber, team1, team2) {
    const matchData = {
      session_id: sessionId,
      court_number: courtNumber,
      team1,
      team2
    };
    
    const match = await this.db.createMatch(matchData);
    
    // Record match start event
    await this.recordMatchEvent(match.id, 'match_start', {
      teams: { team1, team2 },
      court_number: courtNumber
    });
    
    return match;
  }

  async completeMatch(matchId, winnerTeam, scoreData = null) {
    const matches = await this.db.getMatches();
    const match = matches.find(m => m.id === matchId);
    if (!match) throw new Error('Match not found');
    
    // Complete the match
    const completedMatch = await this.db.completeMatch(matchId, winnerTeam, scoreData);
    
    // Update player stats and ELO
    await this.updatePlayerStatsFromMatch(completedMatch, winnerTeam);
    
    // Record match completion event
    await this.recordMatchEvent(matchId, 'match_end', {
      winner_team: winnerTeam,
      score: scoreData,
      duration_minutes: completedMatch.match_duration_minutes
    });
    
    return completedMatch;
  }

  async updatePlayerStatsFromMatch(match, winnerTeam) {
    const playerIds = [
      match.team1_player1_id,
      match.team1_player2_id,
      match.team2_player1_id,
      match.team2_player2_id
    ];
    
    const players = await this.db.getPlayers();
    const sessionPlayers = await this.db.getSessionPlayers(match.session_id);
    
    for (const playerId of playerIds) {
      const player = players.find(p => p.id === playerId);
      const sessionPlayer = sessionPlayers.find(sp => sp.player_id === playerId);
      if (!player || !sessionPlayer) continue;
      
      // Determine if player won
      const isTeam1 = match.team1_player1_id === playerId || match.team1_player2_id === playerId;
      const won = (isTeam1 && winnerTeam === 1) || (!isTeam1 && winnerTeam === 2);
      
      // Calculate ELO changes using new system
      const currentELO = player.current_elo || 1200;
      const matchCount = player.total_matches || 0;
      const confidence = player.confidence || 1.0;
      
      // For now, use average opponent ELO (could be improved with team calculation)
      const averageOpponentELO = 1200; // TODO: Calculate actual opponent team ELO
      
      const eloResult = calculateELOChange({
        playerELO: currentELO,
        opponentELO: averageOpponentELO,
        isWin: won,
        matchCount,
        confidence
      });
      
      const newElo = eloResult.newELO;
      
      // Update global player stats
      await this.db.updatePlayer(playerId, {
        total_matches: player.total_matches + 1,
        total_wins: player.total_wins + (won ? 1 : 0),
        total_losses: player.total_losses + (won ? 0 : 1),
        current_elo: newElo,
        highest_elo: Math.max(player.highest_elo || 1200, newElo),
        lowest_elo: Math.min(player.lowest_elo || 1200, newElo),
        last_match_at: new Date().toISOString(),
        
        // Update legacy fields for compatibility
        wins: player.total_wins + (won ? 1 : 0),
        losses: player.total_losses + (won ? 0 : 1),
        matchCount: player.total_matches + 1,
        elo: newElo,
        lastMatchTime: new Date().toISOString()
      });
      
      // Update session player stats
      const sessionPlayerUpdates = {
        session_matches: sessionPlayer.session_matches + 1,
        session_wins: sessionPlayer.session_wins + (won ? 1 : 0),
        session_losses: sessionPlayer.session_losses + (won ? 0 : 1),
        session_elo_current: sessionPlayer.session_elo_current + (won ? 25 : -23),
        session_elo_peak: Math.max(
          sessionPlayer.session_elo_peak || 1200,
          sessionPlayer.session_elo_current + (won ? 25 : -23)
        )
      };
      
      // Update session player record
      const allSessionPlayers = await this.db.get('session_players', []);
      const updatedSessionPlayers = allSessionPlayers.map(sp => {
        if (sp.session_id === match.session_id && sp.player_id === playerId) {
          return { ...sp, ...sessionPlayerUpdates };
        }
        return sp;
      });
      await this.db.set('session_players', updatedSessionPlayers);
      
      // Record ELO change
      await this.db.recordEloChange({
        player_id: playerId,
        match_id: match.id,
        session_id: match.session_id,
        elo_before: oldElo,
        elo_after: newElo,
        was_winner: won,
        opponent_elo: this.calculateAverageOpponentElo(match, playerId, players)
      });
    }
  }

  calculateAverageOpponentElo(match, playerId, players) {
    const isTeam1 = match.team1_player1_id === playerId || match.team1_player2_id === playerId;
    const opponentIds = isTeam1 
      ? [match.team2_player1_id, match.team2_player2_id]
      : [match.team1_player1_id, match.team1_player2_id];
    
    const opponents = opponentIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean);
    
    const totalElo = opponents.reduce((sum, opponent) => sum + opponent.current_elo, 0);
    return Math.round(totalElo / Math.max(opponents.length, 1));
  }

  // Match events (for detailed tracking)
  async recordMatchEvent(matchId, eventType, eventData) {
    const matchEvents = await this.db.get('match_events', []);
    const newEvent = {
      id: generateId(),
      match_id: matchId,
      event_type: eventType,
      event_data: eventData,
      created_at: new Date().toISOString(),
      player_id: eventData.player_id || null,
      created_by: null // Will be user ID when auth is added
    };
    
    const updatedEvents = [...matchEvents, newEvent];
    await this.db.set('match_events', updatedEvents);
    
    return newEvent;
  }

  // Analytics and reporting
  async generateLeaderboard(sessionId = null) {
    const players = await this.db.getPlayers();
    
    if (sessionId) {
      // Session leaderboard
      const sessionPlayers = await this.db.getSessionPlayers(sessionId);
      return sessionPlayers
        .filter(sp => sp.is_active_in_session)
        .sort((a, b) => b.session_wins - a.session_wins)
        .map(sp => {
          const player = players.find(p => p.id === sp.player_id);
          return { ...player, ...sp };
        });
    } else {
      // Global leaderboard
      return players
        .sort((a, b) => b.current_elo - a.current_elo)
        .slice(0, 50); // Top 50 players
    }
  }

  async getMatchHistory(playerId = null, sessionId = null, limit = 50) {
    const matches = await this.db.getMatches(sessionId);
    
    let filteredMatches = matches.filter(m => m.completed_at || m.cancelled_at);
    
    if (playerId) {
      filteredMatches = filteredMatches.filter(match =>
        match.team1_player1_id === playerId ||
        match.team1_player2_id === playerId ||
        match.team2_player1_id === playerId ||
        match.team2_player2_id === playerId
      );
    }
    
    return filteredMatches
      .sort((a, b) => new Date(b.completed_at || b.cancelled_at) - new Date(a.completed_at || a.cancelled_at))
      .slice(0, limit);
  }
}

// Export singleton instance
const gameService = new GameService();
export default gameService;
