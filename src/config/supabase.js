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
let _lastNetworkState = navigator.onLine;

// Enhanced network change detection
let _networkChangeListeners = [];
let _lastConnectionTime = Date.now();

// Reset client when network state changes to prevent stale connections
function resetClientOnNetworkChange() {
  const currentNetworkState = navigator.onLine;
  const now = Date.now();
  
  // Reset if network state changed OR if it's been a while since last connection
  const timeSinceLastConnection = now - _lastConnectionTime;
  const shouldResetForTime = timeSinceLastConnection > 300000; // 5 minutes
  
  if (_lastNetworkState !== currentNetworkState || shouldResetForTime) {
    console.log(`Network state changed: ${_lastNetworkState} -> ${currentNetworkState} or timeout (${timeSinceLastConnection}ms). Resetting Supabase client.`);
    _supabaseClient = null;
    _connectionPromise = null;
    _lastNetworkState = currentNetworkState;
    _lastConnectionTime = now;
  }
}

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
  
  // Monitor connection type changes (if supported)
  if ('connection' in navigator) {
    const connectionChangeListener = () => {
      console.log('Connection type changed - resetting client');
      resetClient();
    };
    navigator.connection.addEventListener('change', connectionChangeListener);
    _networkChangeListeners.push({ event: 'connection-change', listener: connectionChangeListener });
  }
}

// Connection warming to establish fresh SSL handshake
async function warmConnection(url) {
  try {
    // Attempt to establish a fresh connection to the domain
    const domain = new URL(url).origin;
    console.log(`Warming connection to ${domain}...`);
    
    // Use a simple HEAD request to establish SSL handshake
    await fetch(`${domain}/rest/v1/`, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    });
    
    console.log(`Connection warmed successfully for ${domain}`);
    return true;
  } catch (error) {
    console.warn(`Connection warming failed: ${error.message}`);
    return false;
  }
}

// Enhanced retry mechanism with connection warming
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // On first retry after a cert error, try warming the connection
      if (attempt > 1 && lastError && 
          (lastError.message.includes('ERR_CERT_AUTHORITY_INVALID') || 
           lastError.message.includes('Failed to fetch'))) {
        
        console.log(`Attempting connection warming before retry ${attempt}...`);
        await warmConnection(SUPABASE_URL);
        
        // Add a small delay after warming
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check for network-related errors that should trigger retry
      const isNetworkError = error.message.includes('Failed to fetch') || 
                           error.message.includes('ERR_CERT_AUTHORITY_INVALID') ||
                           error.message.includes('Network request failed') ||
                           error.message.includes('net::ERR_CERT_AUTHORITY_INVALID') ||
                           error.name === 'TimeoutError' ||
                           error.name === 'TypeError';
      
      if (!isNetworkError) {
        throw error; // Don't retry non-network errors
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Network request failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
      console.log(`Error details:`, error.message);
      
      // Reset client before retry to clear stale connections
      _supabaseClient = null;
      _connectionPromise = null;
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Supabase client factory with singleton pattern
export async function createSupabaseClient() {
  // Setup network monitoring on first call
  setupNetworkMonitoring();
  
  // Check if network state changed and reset client if needed
  resetClientOnNetworkChange();
  
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
      
      // Test the connection with detailed logging and retry mechanism
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

// Public function to reset Supabase client (useful for network reconnection)
export function resetSupabaseClient() {
  console.log('Manually resetting Supabase client...');
  _supabaseClient = null;
  _connectionPromise = null;
  _lastNetworkState = navigator.onLine;
  _lastConnectionTime = Date.now();
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
  resetSupabaseClient,
  setupRealtimeSubscriptions,
  cleanupSubscriptions
};
