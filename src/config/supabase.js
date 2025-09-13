// Supabase Configuration
// This file will handle Supabase client initialization and configuration

// Environment variables (to be set in .env file)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Supabase client configuration
export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    // Add custom fetch with better error handling for network issues
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          // Add timeout to prevent hanging on network issues
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }).catch(error => {
          console.error('Network request failed:', error.message);
          if (error.name === 'TimeoutError') {
            throw new Error('Network timeout - check your internet connection or firewall settings');
          }
          if (error.message.includes('Failed to fetch')) {
            throw new Error('Network blocked - your firewall (Cisco Umbrella detected) may be blocking Supabase access');
          }
          throw error;
        });
      }
    }
  }
};

// Database table names
export const TABLES = {
  PLAYERS: 'players',
  SESSIONS: 'sessions',
  SESSION_PLAYERS: 'session_players',
  MATCHES: 'matches',
  ELO_HISTORY: 'elo_history',
  COURTS: 'courts',
  MATCH_EVENTS: 'match_events',
  SESSION_SETTINGS: 'session_settings'
};

// Real-time subscription channels
export const CHANNELS = {
  PLAYERS: 'players_changes',
  SESSIONS: 'sessions_changes',
  MATCHES: 'matches_changes',
  ELO_HISTORY: 'elo_changes'
};

// Migration configuration
export const MIGRATION_CONFIG = {
  // localStorage keys to migrate
  LEGACY_KEYS: {
    PLAYERS: 'badminton-players',
    SESSIONS: 'badminton-sessions',
    MATCHES: 'badminton-matches',
    CURRENT_SESSION: 'badminton-current-session',
    COURT_STATES: 'badminton-court-states'
  },
  
  // Batch size for large migrations
  BATCH_SIZE: 100,
  
  // Whether to keep localStorage data after migration
  KEEP_LOCAL_BACKUP: true
};

// Singleton Supabase client to prevent multiple instances
let _supabaseClient = null;
let _connectionPromise = null;

// Supabase client factory with singleton pattern
export async function createSupabaseClient() {
  // Return existing client if already created
  if (_supabaseClient) {
    return _supabaseClient;
  }
  
  // Return existing connection promise if in progress
  if (_connectionPromise) {
    return _connectionPromise;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not found. Running in localStorage mode.');
    return null;
  }
  
  // Create connection promise to avoid multiple simultaneous connections
  _connectionPromise = (async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig.options);
      
      // Disable realtime connection to prevent WebSocket errors
      // This prevents automatic WebSocket connection attempts
      if (supabase.realtime) {
        try {
          supabase.realtime.disconnect();
          console.log('Supabase realtime connection disabled to prevent WebSocket errors');
        } catch (realtimeError) {
          console.warn('Could not disable realtime connection:', realtimeError.message);
        }
      }
      
      // Test the connection with detailed logging
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase.from('players').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log('Supabase connection test error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.warn('⚠️ Supabase connected but tables not found. Run the database schema first!');
        } else if (error.message && error.message.includes('Network blocked')) {
          console.error('🚫 Network Access Blocked: Your network firewall is blocking Supabase access');
          console.error('💡 Solutions:');
          console.error('   1. Connect to a different network (mobile hotspot, home WiFi)');
          console.error('   2. Contact your IT admin to whitelist *.supabase.co');
          console.error('   3. Use a VPN if allowed by your organization');
          _connectionPromise = null;
          return null;
        } else {
          console.error('❌ Supabase connection failed:', error.message);
          _connectionPromise = null;
          return null;
        }
      } else {
        console.log('✅ Supabase client connected successfully with working tables');
      
      // Store config for admin tools
      try {
        localStorage.setItem('supabase_config', JSON.stringify({
          url: SUPABASE_URL,
          key: SUPABASE_ANON_KEY
        }));
      } catch (error) {
        console.warn('Could not store Supabase config:', error);
      }
      }
      
      _supabaseClient = supabase;
      _connectionPromise = null;
      return supabase;
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      _connectionPromise = null;
      return null;
    }
  })();
  
  return _connectionPromise;
}

// Real-time subscription setup
export function setupRealtimeSubscriptions(supabaseClient, callbacks) {
  if (!supabaseClient) return [];
  
  const subscriptions = [];
  
  // Players subscription
  const playersSubscription = supabaseClient
    .channel(CHANNELS.PLAYERS)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: TABLES.PLAYERS },
      callbacks.onPlayersChange
    )
    .subscribe();
  
  subscriptions.push(playersSubscription);
  
  // Sessions subscription
  const sessionsSubscription = supabaseClient
    .channel(CHANNELS.SESSIONS)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: TABLES.SESSIONS },
      callbacks.onSessionsChange
    )
    .subscribe();
  
  subscriptions.push(sessionsSubscription);
  
  // Matches subscription
  const matchesSubscription = supabaseClient
    .channel(CHANNELS.MATCHES)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: TABLES.MATCHES },
      callbacks.onMatchesChange
    )
    .subscribe();
  
  subscriptions.push(matchesSubscription);
  
  return subscriptions;
}

// Cleanup subscriptions
export function cleanupSubscriptions(subscriptions) {
  subscriptions.forEach(subscription => {
    subscription.unsubscribe();
  });
}

export default {
  supabaseConfig,
  TABLES,
  CHANNELS,
  MIGRATION_CONFIG,
  createSupabaseClient,
  setupRealtimeSubscriptions,
  cleanupSubscriptions
};
