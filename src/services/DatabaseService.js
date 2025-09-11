// Database Service Layer - Abstraction for storage implementation
// Currently uses localStorage, can be swapped for Supabase later

import { generateId } from '../utils/helpers';

class DatabaseService {
  constructor() {
    this.storagePrefix = 'badminton_';
    this.isOnline = false; // Will be true when connected to Supabase
  }

  // Generic storage methods
  async get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.storagePrefix + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  async set(key, value) {
    try {
      localStorage.setItem(this.storagePrefix + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  async delete(key) {
    try {
      localStorage.removeItem(this.storagePrefix + key);
      return true;
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      return false;
    }
  }

  // Player methods
  async getPlayers() {
    return await this.get('players', []);
  }

  async createPlayer(playerData) {
    const players = await this.getPlayers();
    const newPlayer = {
      id: generateId(),
      name: playerData.name,
      email: playerData.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Lifetime stats
      total_matches: 0,
      total_wins: 0,
      total_losses: 0,
      current_elo: 1200,
      highest_elo: 1200,
      lowest_elo: 1200,
      
      // Metadata
      is_active: true,
      last_match_at: null,
      avatar_url: null,
      
    };
    
    const updatedPlayers = [...players, newPlayer];
    await this.set('players', updatedPlayers);
    
    return newPlayer;
  }

  async updatePlayer(playerId, updates) {
    const players = await this.getPlayers();
    const playerIndex = players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      throw new Error(`Player with ID ${playerId} not found`);
    }
    
    const updatedPlayer = {
      ...players[playerIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    players[playerIndex] = updatedPlayer;
    await this.set('players', players);
    
    return updatedPlayer;
  }

  async deletePlayer(playerId) {
    const players = await this.getPlayers();
    const updatedPlayers = players.filter(p => p.id !== playerId);
    await this.set('players', updatedPlayers);
    
    return true;
  }

  // Session methods
  async getSessions() {
    return await this.get('sessions', []);
  }

  async createSession(sessionData) {
    const sessions = await this.getSessions();
    const newSession = {
      id: generateId(),
      name: sessionData.name,
      description: sessionData.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ended_at: null,
      
      // Session settings
      court_count: 4,
      max_players: null,
      
      // Session stats
      total_matches_played: 0,
      session_duration_minutes: 0,
      
      // Status
      is_active: true,
      created_by: null, // Will be user ID when auth is added
      
    };
    
    const updatedSessions = [...sessions, newSession];
    await this.set('sessions', updatedSessions);
    
    return newSession;
  }

  async updateSession(sessionId, updates) {
    const sessions = await this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    const updatedSession = {
      ...sessions[sessionIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    sessions[sessionIndex] = updatedSession;
    await this.set('sessions', sessions);
    
    return updatedSession;
  }

  async deleteSession(sessionId) {
    const sessions = await this.getSessions();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    await this.set('sessions', updatedSessions);
    
    // Also clean up related data
    await this.deleteSessionPlayers(sessionId);
    await this.deleteSessionMatches(sessionId);
    
    return true;
  }

  // Session Players methods
  async getSessionPlayers(sessionId) {
    const sessionPlayers = await this.get('session_players', []);
    return sessionPlayers.filter(sp => sp.session_id === sessionId);
  }

  async addPlayerToSession(sessionId, playerId) {
    const sessionPlayers = await this.get('session_players', []);
    
    // Check if player already in session
    const existing = sessionPlayers.find(sp => 
      sp.session_id === sessionId && sp.player_id === playerId && !sp.left_at
    );
    
    if (existing) {
      throw new Error('Player already in session');
    }
    
    const newSessionPlayer = {
      id: generateId(),
      session_id: sessionId,
      player_id: playerId,
      joined_at: new Date().toISOString(),
      left_at: null,
      
      // Session-specific stats
      session_matches: 0,
      session_wins: 0,
      session_losses: 0,
      session_elo_start: 1200,
      session_elo_current: 1200,
      session_elo_peak: 1200,
      
      is_active_in_session: true
    };
    
    const updatedSessionPlayers = [...sessionPlayers, newSessionPlayer];
    await this.set('session_players', updatedSessionPlayers);
    
    return newSessionPlayer;
  }

  async removePlayerFromSession(sessionId, playerId) {
    const sessionPlayers = await this.get('session_players', []);
    const updatedSessionPlayers = sessionPlayers.map(sp => {
      if (sp.session_id === sessionId && sp.player_id === playerId) {
        return {
          ...sp,
          left_at: new Date().toISOString(),
          is_active_in_session: false
        };
      }
      return sp;
    });
    
    await this.set('session_players', updatedSessionPlayers);
    return true;
  }

  async deleteSessionPlayers(sessionId) {
    const sessionPlayers = await this.get('session_players', []);
    const updatedSessionPlayers = sessionPlayers.filter(sp => sp.session_id !== sessionId);
    await this.set('session_players', updatedSessionPlayers);
    return true;
  }

  // Match methods
  async getMatches(sessionId = null) {
    const matches = await this.get('matches', []);
    return sessionId ? matches.filter(m => m.session_id === sessionId) : matches;
  }

  async createMatch(matchData) {
    const matches = await this.get('matches', []);
    const newMatch = {
      id: generateId(),
      session_id: matchData.session_id,
      court_number: matchData.court_number,
      
      started_at: new Date().toISOString(),
      completed_at: null,
      cancelled_at: null,
      
      // Teams
      team1_player1_id: matchData.team1.player1.id,
      team1_player2_id: matchData.team1.player2.id,
      team2_player1_id: matchData.team2.player1.id,
      team2_player2_id: matchData.team2.player2.id,
      
      // Results
      winning_team: null,
      score_team1: null,
      score_team2: null,
      
      // Metadata
      match_duration_minutes: null,
      match_type: 'doubles',
      notes: null,
      
    };
    
    const updatedMatches = [...matches, newMatch];
    await this.set('matches', updatedMatches);
    
    return newMatch;
  }

  async completeMatch(matchId, winnerTeam, scoreData = null) {
    const matches = await this.get('matches', []);
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      throw new Error(`Match with ID ${matchId} not found`);
    }
    
    const match = matches[matchIndex];
    const completedMatch = {
      ...match,
      completed_at: new Date().toISOString(),
      winning_team: winnerTeam,
      score_team1: scoreData?.team1Score || null,
      score_team2: scoreData?.team2Score || null,
      match_duration_minutes: scoreData?.duration || Math.floor((new Date() - new Date(match.started_at)) / 60000),
      
    };
    
    matches[matchIndex] = completedMatch;
    await this.set('matches', matches);
    
    return completedMatch;
  }

  async cancelMatch(matchId) {
    const matches = await this.get('matches', []);
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      throw new Error(`Match with ID ${matchId} not found`);
    }
    
    const match = matches[matchIndex];
    const cancelledMatch = {
      ...match,
      cancelled_at: new Date().toISOString(),
      
    };
    
    matches[matchIndex] = cancelledMatch;
    await this.set('matches', matches);
    
    return cancelledMatch;
  }

  async deleteSessionMatches(sessionId) {
    const matches = await this.get('matches', []);
    const updatedMatches = matches.filter(m => m.session_id !== sessionId);
    await this.set('matches', updatedMatches);
    return true;
  }

  // ELO History methods
  async getEloHistory(playerId = null, sessionId = null) {
    const eloHistory = await this.get('elo_history', []);
    
    if (playerId && sessionId) {
      return eloHistory.filter(eh => eh.player_id === playerId && eh.session_id === sessionId);
    } else if (playerId) {
      return eloHistory.filter(eh => eh.player_id === playerId);
    } else if (sessionId) {
      return eloHistory.filter(eh => eh.session_id === sessionId);
    }
    
    return eloHistory;
  }

  async recordEloChange(eloChangeData) {
    const eloHistory = await this.get('elo_history', []);
    const newEloRecord = {
      id: generateId(),
      player_id: eloChangeData.player_id,
      match_id: eloChangeData.match_id,
      session_id: eloChangeData.session_id,
      
      elo_before: eloChangeData.elo_before,
      elo_after: eloChangeData.elo_after,
      elo_change: eloChangeData.elo_after - eloChangeData.elo_before,
      
      was_winner: eloChangeData.was_winner,
      opponent_elo: eloChangeData.opponent_elo,
      created_at: new Date().toISOString()
    };
    
    const updatedEloHistory = [...eloHistory, newEloRecord];
    await this.set('elo_history', updatedEloHistory);
    
    return newEloRecord;
  }


  // Analytics methods (for future dashboard features)
  async getPlayerStats(playerId) {
    const player = (await this.getPlayers()).find(p => p.id === playerId);
    if (!player) return null;
    
    const matches = await this.getMatches();
    const playerMatches = matches.filter(match => 
      match.team1_player1_id === playerId ||
      match.team1_player2_id === playerId ||
      match.team2_player1_id === playerId ||
      match.team2_player2_id === playerId
    );
    
    const eloHistory = await this.getEloHistory(playerId);
    
    return {
      player,
      totalMatches: playerMatches.length,
      recentMatches: playerMatches.slice(-10),
      eloProgression: eloHistory,
      winRate: player.total_wins / Math.max(player.total_matches, 1),
      averageOpponentElo: eloHistory.reduce((sum, eh) => sum + eh.opponent_elo, 0) / Math.max(eloHistory.length, 1)
    };
  }

  async getSessionStats(sessionId) {
    const session = (await this.getSessions()).find(s => s.id === sessionId);
    if (!session) return null;
    
    const matches = await this.getMatches(sessionId);
    const sessionPlayers = await this.getSessionPlayers(sessionId);
    
    return {
      session,
      totalMatches: matches.length,
      completedMatches: matches.filter(m => m.completed_at).length,
      activeMatches: matches.filter(m => !m.completed_at && !m.cancelled_at).length,
      totalPlayers: sessionPlayers.length,
      activePlayers: sessionPlayers.filter(sp => sp.is_active_in_session).length,
      averageMatchDuration: matches.reduce((sum, m) => sum + (m.match_duration_minutes || 0), 0) / Math.max(matches.length, 1)
    };
  }

  // Future Supabase methods (stubs for now)
  async connectToSupabase(supabaseConfig) {
    // TODO: Initialize Supabase client
    console.log('Connecting to Supabase...', supabaseConfig);
    this.isOnline = true;
    return true;
  }

  async syncWithSupabase() {
    if (!this.isOnline) return false;
    
    // TODO: Implement bidirectional sync
    console.log('Syncing with Supabase...');
    return true;
  }

  async enableRealtimeSync() {
    if (!this.isOnline) return false;
    
    // TODO: Set up real-time subscriptions
    console.log('Enabling real-time sync...');
    return true;
  }
}

// Export singleton instance
const databaseService = new DatabaseService();
export default databaseService;
