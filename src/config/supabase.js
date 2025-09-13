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
    // Additional configuration for handling network issues
    db: {
      schema: 'public'
    },
    realtime: {
      // Disable realtime to avoid WebSocket SSL issues
      enabled: false
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


// Singleton Supabase client to prevent multiple instances
let _supabaseClient = null;
let _connectionPromise = null;


// Supabase client factory with improved singleton pattern
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
    console.warn('Missing credentials:', {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
    });
    console.warn('Please create .env.local file with:');
    console.warn('REACT_APP_SUPABASE_URL=your_supabase_url');
    console.warn('REACT_APP_SUPABASE_ANON_KEY=your_anon_key');
    return null;
  }
  
  // Create connection promise to avoid multiple simultaneous connections
  _connectionPromise = (async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig.options);
      
      // Store client and clear promise on success
      _supabaseClient = supabase;
      _connectionPromise = null;
      
      return supabase;
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      
      // Clear promise on failure to allow retry
      _connectionPromise = null;
      
      return null;
    }
  })();
  
  return _connectionPromise;
}

// Reset client (useful for testing or reconnection)
export function resetSupabaseClient() {
  _supabaseClient = null;
  _connectionPromise = null;
}

export default {
  supabaseConfig,
  TABLES,
  createSupabaseClient,
  resetSupabaseClient
};
