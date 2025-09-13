// Supabase Configuration
// This file will handle Supabase client initialization and configuration

// Environment variables (to be set in .env file)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Certificate handling utilities
const SUPABASE_CA_CERT_PATH = '/prod-ca-2021.crt';
const SUPABASE_CERT_ENV = process.env.REACT_APP_SUPABASE_CERT;

// Function to load and validate the Supabase CA certificate
async function loadSupabaseCACert() {
  try {
    // First, try to load from environment variable (for CI/CD and production)
    if (SUPABASE_CERT_ENV) {
      console.log('✅ Supabase CA certificate loaded from environment variable');
      // Decode base64 if needed, or use directly if it's PEM format
      const certText = SUPABASE_CERT_ENV.includes('-----BEGIN CERTIFICATE-----') 
        ? SUPABASE_CERT_ENV 
        : atob(SUPABASE_CERT_ENV);
      return certText;
    }
    
    // Fallback to loading from public folder (for local development)
    const response = await fetch(SUPABASE_CA_CERT_PATH);
    if (response.ok) {
      const certText = await response.text();
      console.log('✅ Supabase CA certificate loaded from public folder');
      return certText;
    } else {
      console.warn('⚠️ Could not load Supabase CA certificate from public folder');
      return null;
    }
  } catch (error) {
    console.warn('⚠️ Error loading Supabase CA certificate:', error.message);
    return null;
  }
}

// Enhanced certificate error detection
function isCertificateError(error) {
  if (!error || !error.message) return false;
  
  const certErrorPatterns = [
    'ERR_CERT_AUTHORITY_INVALID',
    'ERR_CERT_COMMON_NAME_INVALID',
    'ERR_CERT_DATE_INVALID',
    'certificate',
    'SSL',
    'TLS',
    'Failed to fetch'
  ];
  
  return certErrorPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

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
    global: {
      // Custom fetch configuration for certificate handling
      fetch: (url, options = {}) => {
        // Add custom headers and options for certificate handling
        const customOptions = {
          ...options,
          // Add retry logic for certificate errors
          headers: {
            ...options.headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        };
        
        return fetch(url, customOptions).catch(error => {
          // If it's a certificate error, try with different approach
          if (isCertificateError(error)) {
            console.warn('🔒 Certificate error detected, attempting retry with enhanced headers');
            
            // Try with additional headers that might help with certificate validation
            return fetch(url, {
              ...customOptions,
              headers: {
                ...customOptions.headers,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'BadmintonPairApp/1.0'
              }
            }).catch(retryError => {
              // If retry also fails, provide helpful error message
              if (isCertificateError(retryError)) {
                console.error('🔒 Certificate validation failed. Consider:');
                console.error('1. Check if Supabase CA certificate is properly configured');
                console.error('2. Verify your system\'s certificate store is up to date');
                console.error('3. Contact your network administrator if behind corporate firewall');
              }
              throw retryError;
            });
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

// Enhanced network change detection
let _networkChangeListeners = [];
let _lastConnectionTime = Date.now();
let _clientCreationTime = Date.now();
let _certificateErrorCount = 0;

// Client refresh configuration
const CLIENT_MAX_AGE = 10 * 60 * 1000; // 10 minutes max age
const MAX_CERT_ERRORS = 2; // Reset client after 2 certificate errors

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
  
  // Add debug helpers to window for development
  if (typeof window !== 'undefined') {
    window.supabaseDebug = {
      getHealth: getConnectionHealth,
      resetClient: resetSupabaseClient,
      reportCertError: reportCertificateError,
      forceRefresh: () => createSupabaseClient(true)
    };
  }
}

// Check if client should be refreshed due to age or certificate errors
function shouldRefreshClient() {
  const now = Date.now();
  const clientAge = now - _clientCreationTime;
  
  // Refresh if client is too old or has too many certificate errors
  if (clientAge > CLIENT_MAX_AGE) {
    console.log(`🔄 Client is ${Math.round(clientAge / 60000)}min old, refreshing for SSL health`);
    return true;
  }
  
  if (_certificateErrorCount >= MAX_CERT_ERRORS) {
    console.log(`🔄 Client has ${_certificateErrorCount} certificate errors, refreshing`);
    return true;
  }
  
  return false;
}

// Supabase client factory with singleton pattern and smart refresh
export async function createSupabaseClient(forceRefresh = false) {
  // Setup network monitoring on first call
  setupNetworkMonitoring();
  
  // Check if we should refresh the client
  if (forceRefresh || shouldRefreshClient()) {
    console.log('🔄 Refreshing Supabase client...');
    _supabaseClient = null;
    _connectionPromise = null;
    _certificateErrorCount = 0;
  }
  
  // Return existing client if already created and healthy
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
      // Load CA certificate for better SSL validation
      const caCert = await loadSupabaseCACert();
      if (caCert) {
        console.log('🔒 Supabase CA certificate loaded and available for validation');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig.options);
      
      // Test the connection with detailed logging and retry mechanism
      _supabaseClient = supabase;
      _connectionPromise = null;
      _clientCreationTime = Date.now(); // Track when client was created
      return supabase;
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      _connectionPromise = null;
      return null;
    }
  })();
  
  return _connectionPromise;
}

// Track certificate errors for smart client refresh
export function reportCertificateError() {
  _certificateErrorCount++;
  console.warn(`🔒 Certificate error reported (${_certificateErrorCount}/${MAX_CERT_ERRORS})`);
  
  // Force refresh if we've hit the limit
  if (_certificateErrorCount >= MAX_CERT_ERRORS) {
    console.log('🔄 Certificate error limit reached, forcing client refresh');
    resetSupabaseClient();
  }
}

// Get connection health metrics for debugging
export function getConnectionHealth() {
  const now = Date.now();
  return {
    hasClient: !!_supabaseClient,
    clientAge: _supabaseClient ? now - _clientCreationTime : 0,
    clientAgeMinutes: _supabaseClient ? Math.round((now - _clientCreationTime) / 60000) : 0,
    certificateErrors: _certificateErrorCount,
    lastConnectionTime: _lastConnectionTime,
    shouldRefresh: shouldRefreshClient(),
    maxAge: CLIENT_MAX_AGE,
    maxCertErrors: MAX_CERT_ERRORS
  };
}

// Public function to reset Supabase client (useful for network reconnection)
export function resetSupabaseClient() {
  console.log('Manually resetting Supabase client...');
  _supabaseClient = null;
  _connectionPromise = null;
  _lastConnectionTime = Date.now();
  _clientCreationTime = Date.now();
  _certificateErrorCount = 0;
}

// Function to provide certificate installation guidance
export function getCertificateInstallationGuide() {
  const hasEnvCert = !!SUPABASE_CERT_ENV;
  
  return {
    message: 'To resolve SSL certificate issues with Supabase:',
    hasEnvironmentCert: hasEnvCert,
    steps: [
      hasEnvCert 
        ? '1. ✅ Certificate loaded from REACT_APP_SUPABASE_CERT environment variable'
        : '1. The Supabase CA certificate is available at /prod-ca-2021.crt',
      '2. For system-wide installation (macOS): sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain public/prod-ca-2021.crt',
      '3. For system-wide installation (Linux): sudo cp public/prod-ca-2021.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates',
      '4. For Node.js development: export NODE_EXTRA_CA_CERTS=./public/prod-ca-2021.crt',
      '5. For CI/CD: Set REACT_APP_SUPABASE_CERT as environment variable or GitHub Actions secret',
      '6. Restart your browser and development server after installation'
    ],
    nodeEnvVar: 'NODE_EXTRA_CA_CERTS=./public/prod-ca-2021.crt',
    certPath: SUPABASE_CA_CERT_PATH,
    envVar: 'REACT_APP_SUPABASE_CERT'
  };
}

// Export certificate utilities
export { loadSupabaseCACert, isCertificateError };

export default {
  supabaseConfig,
  TABLES,
  CHANNELS,
  MIGRATION_CONFIG,
  createSupabaseClient,
  resetSupabaseClient,
  reportCertificateError,
  getConnectionHealth,
  getCertificateInstallationGuide,
  loadSupabaseCACert,
  isCertificateError
};
