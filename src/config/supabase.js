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

// Real-time subscription channels
export const CHANNELS = {
  PLAYERS: 'players_changes',
  SESSIONS: 'sessions_changes',
  MATCHES: 'matches_changes',
  ELO_HISTORY: 'elo_changes'
};


// Singleton Supabase client to prevent multiple instances
let _supabaseClient = null;
let _connectionPromise = null;

// Enhanced network change detection
let _networkChangeListeners = [];
let _lastConnectionTime = Date.now();
let _lastNetworkState = navigator.onLine;

// Setup enhanced network monitoring
function setupNetworkMonitoring() {
  if (_networkChangeListeners.length > 0) return; // Already setup
  
  const resetClient = () => {
    console.log('Network event detected - resetting Supabase client');
    _supabaseClient = null;
    _connectionPromise = null;
    _lastConnectionTime = Date.now();
  };
  
  // Listen for various network events
  const events = ['online', 'offline'];
  events.forEach(event => {
    const listener = resetClient;
    window.addEventListener(event, listener);
    _networkChangeListeners.push({ event, listener });
  });
  
}

// Supabase client factory with singleton pattern
export async function createSupabaseClient() {
  // Setup network monitoring on first call
  setupNetworkMonitoring();
  
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
      
      // Skip connection test here - connection testing removed for simplicity
      // This prevents multiple simultaneous HEAD requests during client creation
      
      // Only set as singleton after successful creation (fix race condition)
      _supabaseClient = supabase;
      _connectionPromise = null;
      return supabase;
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      _supabaseClient = null;  // Ensure client is null on error
      _connectionPromise = null;
      return null;
    }
  })();
  
  return _connectionPromise;
}

// Public function to reset Supabase client (useful for network reconnection)
export function resetSupabaseClient() {
  console.log('Manually resetting Supabase client...');
  _supabaseClient = null;
  _connectionPromise = null;
  _lastNetworkState = navigator.onLine;
  _lastConnectionTime = Date.now();
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
  createSupabaseClient,
  resetSupabaseClient,
  cleanupSubscriptions
};
