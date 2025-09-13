import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient, TABLES, reportCertificateError } from '../config/supabase';

export function useSupabaseStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue || []);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [useSupabase, setUseSupabase] = useState(true); // Always try to use Supabase first

  // Initialize data source and load data
  useEffect(() => {
    let isMounted = true;
    
    const initializeStorage = async () => {
      try {
        console.log(`🚀 Initializing Supabase storage for ${key}`);
        
        // Get Supabase client (required for online-only operation)
        const client = await createSupabaseClient();
        
        if (!client) {
          throw new Error('Supabase client not available - internet connection required');
        }
        
        if (isMounted) {
          setSupabaseClient(client);
          setUseSupabase(true);
          
          // Special handling for ELO history - don't auto-load but keep sync ready
          if (key === 'badminton_elo_history') {
            console.log(`📊 ELO history - Supabase sync ready but not auto-loading`);
            setStoredValue(initialValue || []);
          } else {
            // Load data from Supabase for all other keys
            await loadFromSupabase(client, key);
          }
        }
      } catch (error) {
        console.error(`Error initializing Supabase storage for ${key}:`, error);
        if (isMounted) {
          // In online-only mode, we don't fall back to localStorage
          // The app should block access if Supabase is not available
          setUseSupabase(false);
          setStoredValue(initialValue || []);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeStorage();
    
    // Cleanup function to prevent state updates on unmounted components
    return () => {
      isMounted = false;
    };
  }, [key]);

  // Note: localStorage functions removed - app now requires internet connection

  // Load data from Supabase
  const loadFromSupabase = async (client, storageKey) => {
    try {
      const tableName = getSupabaseTable(storageKey);
      if (!tableName) {
        console.warn(`No Supabase table mapping for ${storageKey}, using initial value`);
        setStoredValue(initialValue || []);
        return;
      }

      // Determine the appropriate ordering column for each table
      let orderColumn = 'created_at'; // default
      if (tableName === TABLES.SESSION_PLAYERS) {
        orderColumn = 'joined_at';
      } else if (tableName === TABLES.MATCHES) {
        orderColumn = 'started_at';
      }

      const { data, error } = await client
        .from(tableName)
        .select('*')
        .order(orderColumn, { ascending: true });

      if (error) {
        console.error(`Supabase load error for ${storageKey}:`, error);
        
        // Check if this is a certificate or network error
        if (error.message && (error.message.includes('Failed to fetch') || 
                              error.message.includes('ERR_CERT_AUTHORITY_INVALID') ||
                              error.message.includes('certificate'))) {
          console.warn(`🔒 Certificate/network error detected for ${storageKey}`);
          reportCertificateError();
        }
        
        console.warn(`Failed to load from Supabase, using initial value for ${storageKey}`);
        setStoredValue(initialValue || []);
        return;
      }

      // Always use Supabase as source of truth
      console.log(`📥 Loaded ${data?.length || 0} items from Supabase for ${storageKey}`);

      if (data && data.length > 0) {
        // Transform and use Supabase data
        const transformedData = await transformSupabaseToLocal(data, tableName, client);
        setStoredValue(transformedData);
        
        // Update localStorage to match Supabase (Supabase is source of truth)
        // EXCEPT for session_players which is localStorage-only for now
        if (tableName !== TABLES.SESSION_PLAYERS) {
        window.localStorage.setItem(storageKey, JSON.stringify(transformedData));
        }
      } else {
        // Supabase is empty, but let's check if we should do a ONE-TIME migration from localStorage
        const hasLocalData = window.localStorage.getItem(storageKey);
        const shouldMigrate = hasLocalData && !window.localStorage.getItem(`${storageKey}_migrated`);
        
        if (shouldMigrate) {
          console.log(`🔄 One-time migration from localStorage to Supabase for ${storageKey}`);
        await migrateFromLocalStorage(client, storageKey);
          // Mark as migrated to prevent future migrations
          window.localStorage.setItem(`${storageKey}_migrated`, 'true');
          
          // After migration, re-query Supabase to get the migrated data
          const { data: migratedData } = await client
            .from(tableName)
            .select('*')
            .order(orderColumn, { ascending: true });
          
          if (migratedData && migratedData.length > 0) {
            const transformedData = await transformSupabaseToLocal(migratedData, tableName, client);
            setStoredValue(transformedData);
            window.localStorage.setItem(storageKey, JSON.stringify(transformedData));
          } else {
            setStoredValue(initialValue || []);
          }
        } else {
          // No data anywhere or already migrated, use empty state
          setStoredValue(initialValue || []);
          window.localStorage.setItem(storageKey, JSON.stringify(initialValue || []));
        }
      }
    } catch (error) {
      console.error(`Error loading from Supabase (${storageKey}):`, error);
      
      // Check if this is a certificate or network error
      if (error.message && (error.message.includes('Failed to fetch') || 
                            error.message.includes('ERR_CERT_AUTHORITY_INVALID') ||
                            error.message.includes('certificate') ||
                            error.message.includes('TypeError: Failed to fetch'))) {
        console.warn(`🔒 Certificate/network error detected for ${storageKey}`);
        reportCertificateError();
      }
      
      console.warn(`Failed to load from Supabase, using initial value for ${storageKey}`);
      setStoredValue(initialValue || []);
    }
  };

  // Migrate existing localStorage data to Supabase
  const migrateFromLocalStorage = async (client, storageKey) => {
    try {
      const localItem = window.localStorage.getItem(storageKey);
      if (!localItem) {
        setStoredValue(initialValue || []);
        return;
      }

      const localData = JSON.parse(localItem);
      if (!Array.isArray(localData) || localData.length === 0) {
        setStoredValue(initialValue || []);
        return;
      }

      console.log(`🔄 Migrating ${localData.length} items from localStorage to Supabase`);
      
      const tableName = getSupabaseTable(storageKey);
      if (tableName === TABLES.PLAYERS) {
        await migratePlayersToSupabase(client, localData);
      } else if (tableName === TABLES.SESSIONS) {
        await migrateSessionsToSupabase(client, localData);
      }

      // Reload from Supabase after migration
      await loadFromSupabase(client, storageKey);
    } catch (error) {
      console.error(`Migration error for ${storageKey}:`, error);
      console.warn(`Migration failed for ${storageKey}, using initial value`);
      setStoredValue(initialValue || []);
    }
  };


  // Get Supabase table name for storage key
  const getSupabaseTable = (key) => {
    switch (key) {
      case 'badminton-global-players':
        return TABLES.PLAYERS;
      case 'badminton-sessions':
        return TABLES.SESSIONS;
      case 'badminton_session_players':
        return TABLES.SESSION_PLAYERS;
      case 'badminton_matches':
        return TABLES.MATCHES;
      case 'badminton_elo_history':
        return TABLES.ELO_HISTORY;
      case 'badminton_courts':
        return TABLES.COURTS;
      case 'badminton_match_events':
        return TABLES.MATCH_EVENTS;
      case 'badminton_session_settings':
        return TABLES.SESSION_SETTINGS;
      default:
        return null;
    }
  };

  // Transform Supabase data to local format
  const transformSupabaseToLocal = async (data, tableName, client = supabaseClient) => {
    if (tableName === TABLES.PLAYERS) {
      return data.map(player => ({
        id: player.id,
        name: player.name,
        email: player.email,
        wins: player.total_wins || 0,
        losses: player.total_losses || 0,
        matchCount: player.total_matches || 0,
        elo: player.current_elo || 1200,
        isActive: player.is_active !== false,
        lastMatchTime: player.last_match_at,
        // Add any session stats if they exist
        sessionStats: {}
      }));
    } else if (tableName === TABLES.SESSIONS) {
      return data.map(session => ({
        id: session.id,
        name: session.name,
        description: session.description,
        createdAt: session.created_at,
        lastActiveAt: session.updated_at,
        isActive: session.is_active !== false,
        is_active: session.is_active !== false, // Keep both for compatibility
        courtCount: session.court_count || 4,
        totalMatchesPlayed: session.total_matches_played || 0,
        playerIds: [], // Will be populated from session_players table
        courtStates: [], // Will be initialized by App.js
        currentMatches: [], // Will be reconstructed from active matches
        ended_at: session.ended_at,
        endedAt: session.ended_at
      }));
    } else if (tableName === TABLES.SESSION_PLAYERS) {
      // Load session players with expanded data including player and session names
      const { data: expandedData } = await client
        .from(TABLES.SESSION_PLAYERS)
        .select(`
          *,
          player:players!session_players_player_id_fkey(name),
          session:sessions!session_players_session_id_fkey(name)
        `);
      
      return (expandedData || data).map(sp => ({
        id: sp.id,
        session_id: sp.session_id,
        player_id: sp.player_id,
        // Add name fields for future UUID resolution
        player_name: sp.player?.name || null,
        session_name: sp.session?.name || null,
        joined_at: sp.joined_at,
        left_at: sp.left_at,
        session_matches: sp.session_matches || 0,
        session_wins: sp.session_wins || 0,
        session_losses: sp.session_losses || 0,
        session_elo_start: sp.session_elo_start || 1200,
        session_elo_current: sp.session_elo_current || 1200,
        session_elo_peak: sp.session_elo_peak || 1200,
        is_active_in_session: sp.is_active_in_session !== false
      }));
    } else if (tableName === TABLES.MATCHES) {
      // Get session and player mappings to resolve UUIDs back to names
      if (!client) {
        // Fallback to basic transformation without name resolution
        return data.map(match => ({
          ...match,
          session_name: 'Unknown Session'
        }));
      }
      
      const { data: sessions } = await client
        .from(TABLES.SESSIONS)
        .select('id, name');
      
      const { data: players } = await client
        .from(TABLES.PLAYERS)
        .select('id, name');
      
      const sessionsById = sessions?.reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
      }, {}) || {};
      
      const playersById = players?.reduce((acc, p) => {
        acc[p.id] = p.name;
        return acc;
      }, {}) || {};
      
      return data.map(match => ({
        id: match.id,
        session_id: match.session_id,
        session_name: sessionsById[match.session_id] || 'Unknown Session',
        court_number: match.court_number,
        started_at: match.started_at,
        completed_at: match.completed_at,
        cancelled_at: match.cancelled_at,
        team1_player1_id: match.team1_player1_id,
        team1_player2_id: match.team1_player2_id,
        team2_player1_id: match.team2_player1_id,
        team2_player2_id: match.team2_player2_id,
        // Add resolved player names
        team1_player1_name: playersById[match.team1_player1_id] || 'Unknown Player',
        team1_player2_name: playersById[match.team1_player2_id] || 'Unknown Player',
        team2_player1_name: playersById[match.team2_player1_id] || 'Unknown Player',
        team2_player2_name: playersById[match.team2_player2_id] || 'Unknown Player',
        winning_team: match.winning_team,
        score_team1: match.score_team1,
        score_team2: match.score_team2,
        match_duration_minutes: match.match_duration_minutes,
        match_type: match.match_type || 'doubles',
        notes: match.notes
      }));
    } else if (tableName === TABLES.ELO_HISTORY) {
      return data.map(elo => ({
        id: elo.id,
        player_id: elo.player_id,
        match_id: elo.match_id,
        session_id: elo.session_id,
        elo_before: elo.elo_before,
        elo_after: elo.elo_after,
        elo_change: elo.elo_change,
        was_winner: elo.was_winner,
        opponent_elo: elo.opponent_elo,
        created_at: elo.created_at
      }));
    } else if (tableName === TABLES.COURTS) {
      return data.map(court => ({
        id: court.id,
        session_id: court.session_id,
        court_number: court.court_number,
        name: court.name,
        is_active: court.is_active !== false,
        surface_type: court.surface_type,
        maintenance_status: court.maintenance_status,
        notes: court.notes
      }));
    } else if (tableName === TABLES.MATCH_EVENTS) {
      return data.map(event => ({
        id: event.id,
        match_id: event.match_id,
        event_type: event.event_type,
        event_data: event.event_data,
        created_at: event.created_at,
        player_id: event.player_id,
        created_by: event.created_by
      }));
    } else if (tableName === TABLES.SESSION_SETTINGS) {
      return data.map(setting => ({
        id: setting.id,
        session_id: setting.session_id,
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        setting_type: setting.setting_type,
        created_at: setting.created_at,
        updated_at: setting.updated_at
      }));
    }
    return data;
  };

  // Migrate players to Supabase
  const migratePlayersToSupabase = async (client, players) => {
    for (const player of players) {
      const { error } = await client
        .from(TABLES.PLAYERS)
        .insert({
          name: player.name,
          email: player.email || null,
          total_matches: player.matchCount || 0,
          total_wins: player.wins || 0,
          total_losses: player.losses || 0,
          current_elo: player.elo || 1200,
          highest_elo: player.elo || 1200,
          lowest_elo: player.elo || 1200,
          is_active: player.isActive !== false,
          last_match_at: player.lastMatchTime ? new Date(player.lastMatchTime) : null
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error migrating player:', player.name, error);
      }
    }
  };

  // Migrate sessions to Supabase
  const migrateSessionsToSupabase = async (client, sessions) => {
    for (const session of sessions) {
      const { error } = await client
        .from(TABLES.SESSIONS)
        .insert({
          name: session.name,
          description: session.description || null,
          court_count: session.courtCount || 4,
          is_active: session.isActive !== false,
          total_matches_played: 0
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error migrating session:', session.name, error);
      }
    }
  };

  // Save data (automatically uses Supabase or localStorage)
  const setValue = useCallback(async (value) => {
    try {
      const newValue = typeof value === 'function' ? value(storedValue) : value;
      
      // Clean up old format matches
      let cleanedValue = newValue;
      if (key === 'badminton_matches' && Array.isArray(newValue)) {
        cleanedValue = newValue.filter(match => {
          // Keep matches that have session_name (new format) OR are cancelled/completed (preserve history)
          return match && (
            match.session_name || // New format matches
            match.cancelled_at || // Keep cancelled matches for history
            match.completed_at    // Keep completed matches for history
          );
        });
        if (cleanedValue.length !== newValue.length) {
          console.log(`🧹 Cleaned up ${newValue.length - cleanedValue.length} old format matches`);
        }
      }
      
      // setValue called for ${key}
      
      // Always update local state immediately for better UX
      setStoredValue(cleanedValue);
      
      if (useSupabase && supabaseClient) {
        try {
          // For matches, detect what changed and only sync the differences
          if (key === 'badminton_matches') {
            await saveMatchesDeltaToSupabase(cleanedValue, storedValue);
          } else {
            await saveToSupabase(cleanedValue);
          }
        } catch (supabaseError) {
          console.error(`Failed to save to Supabase for ${key}:`, supabaseError);
          // In online-only mode, we don't fall back to localStorage
          // Revert the optimistic update
          setStoredValue(storedValue);
          throw supabaseError;
        }
      } else {
        throw new Error(`Supabase not available for ${key} - internet connection required`);
      }
    } catch (error) {
      console.error(`Error saving data for ${key}:`, error);
      // Revert optimistic update on failure
      setStoredValue(storedValue);
      throw error;
    }
  }, [useSupabase, supabaseClient, storedValue, key]);

  // Note: localStorage save function removed - using Supabase only

  // Save to Supabase with proper CRUD operations
  const saveToSupabase = async (value) => {
    try {
      const tableName = getSupabaseTable(key);
      if (!tableName || !supabaseClient) {
        throw new Error('Invalid table or no Supabase client');
      }

      if (tableName === TABLES.PLAYERS) {
        await savePlayersToSupabase(value);
      } else if (tableName === TABLES.SESSIONS) {
        await saveSessionsToSupabase(value);
      } else if (tableName === TABLES.SESSION_PLAYERS) {
        await saveSessionPlayersToSupabase(value);
      } else if (tableName === TABLES.MATCHES) {
        await saveMatchesToSupabase(value);
      } else if (tableName === TABLES.ELO_HISTORY) {
        await saveEloHistoryToSupabase(value);
      } else if (tableName === TABLES.COURTS) {
        console.log('⚠️ Courts sync temporarily disabled due to UUID constraints');
        // await saveCourtsToSupabase(value);
      } else if (tableName === TABLES.MATCH_EVENTS) {
        console.log('⚠️ Match events sync temporarily disabled due to UUID constraints');
        // await saveMatchEventsToSupabase(value);
      } else if (tableName === TABLES.SESSION_SETTINGS) {
        console.log('⚠️ Session settings sync temporarily disabled due to UUID constraints');
        // await saveSessionSettingsToSupabase(value);
      }
      
      console.log(`✅ Data saved to Supabase for ${key}`);
    } catch (error) {
      console.error(`❌ Error saving to Supabase for ${key}:`, error);
      // Re-throw to handle in caller, but don't save to localStorage here
      // as the caller will handle the fallback
      throw error;
    }
  };

  // Save players to Supabase
  const savePlayersToSupabase = async (players) => {
    // Get current players from database by name (since we need to map custom IDs to UUIDs)
    const { data: existingPlayers } = await supabaseClient
      .from(TABLES.PLAYERS)
      .select('id, name');
    
    const existingPlayersByName = existingPlayers?.reduce((acc, p) => {
      acc[p.name] = p.id;
      return acc;
    }, {}) || {};
    
    // Process each player
    for (const player of players) {
      if (!player || !player.name) continue;
      
      const playerData = {
        name: player.name,
        email: player.email || null,
        total_matches: player.matchCount || 0,
        total_wins: player.wins || 0,
        total_losses: player.losses || 0,
        current_elo: player.elo || 1200, // Use new default starting ELO
        highest_elo: Math.max(player.elo || 1200, player.highest_elo || 1200),
        lowest_elo: Math.min(player.elo || 1200, player.lowest_elo || 1200),
        confidence: player.confidence || 1.0, // Add confidence field
        is_active: player.isActive !== false,
        last_match_at: player.lastMatchTime ? new Date(player.lastMatchTime) : null,
        updated_at: new Date()
      };

      if (existingPlayersByName[player.name]) {
        // Update existing player by name
        const { error } = await supabaseClient
          .from(TABLES.PLAYERS)
          .update(playerData)
          .eq('name', player.name);
        
        if (error) {
          console.error('Error updating player:', player.name, error);
        }
      } else {
        // Insert new player (let Supabase generate UUID)
        const { error } = await supabaseClient
          .from(TABLES.PLAYERS)
          .insert({ ...playerData, created_at: new Date() });
        
        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error('Error inserting player:', player.name, error);
        }
      }
    }
  };

  // Save sessions to Supabase
  const saveSessionsToSupabase = async (sessions) => {
    // Get existing sessions by name (since names should be unique)
    const { data: existingSessions } = await supabaseClient
      .from(TABLES.SESSIONS)
      .select('id, name');
    
    const existingSessionsByName = existingSessions?.reduce((acc, s) => {
      acc[s.name] = s.id;
      return acc;
    }, {}) || {};
    
    // Process each session
    for (const session of sessions) {
      if (!session || !session.name) continue;
      
      const sessionData = {
        name: session.name,
        description: session.description || null,
        court_count: session.courtCount || 4,
        is_active: session.isActive !== false,
        ended_at: session.ended_at ? new Date(session.ended_at) : null,
        total_matches_played: session.totalMatchesPlayed || 0,
        updated_at: new Date()
      };

      if (existingSessionsByName[session.name]) {
        // Update existing session by name
        const { error } = await supabaseClient
          .from(TABLES.SESSIONS)
          .update(sessionData)
          .eq('name', session.name);
        
        if (error) {
          console.error('Error updating session:', session.name, error);
        }
      } else {
        // Insert new session (let Supabase generate UUID)
        const { error } = await supabaseClient
          .from(TABLES.SESSIONS)
          .insert({ ...sessionData, created_at: new Date() });
        
        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error('Error inserting session:', session.name, error);
        }
      }
    }
  };

  // Save session players to Supabase
  const saveSessionPlayersToSupabase = async (sessionPlayersData) => {
    console.log(`💾 Saving ${sessionPlayersData.length} session players to Supabase`);
    
    // Get player and session mappings to resolve UUIDs
    let { data: players } = await supabaseClient
      .from(TABLES.PLAYERS)
      .select('id, name');
    
    let { data: sessions } = await supabaseClient
      .from(TABLES.SESSIONS)
      .select('id, name');
    
    let playersByName = players?.reduce((acc, p) => {
      acc[p.name] = p.id;
      return acc;
    }, {}) || {};
    
    let sessionsByName = sessions?.reduce((acc, s) => {
      acc[s.name] = s.id;
      return acc;
    }, {}) || {};
    
    // Get existing session players to avoid duplicates
    const { data: existingSessionPlayers } = await supabaseClient
      .from(TABLES.SESSION_PLAYERS)
      .select('id, session_id, player_id');
    
    const existingBySessionAndPlayer = existingSessionPlayers?.reduce((acc, sp) => {
      acc[`${sp.session_id}-${sp.player_id}`] = sp.id;
      return acc;
    }, {}) || {};
    
    // Process each session player
    for (const sessionPlayer of sessionPlayersData) {
      if (!sessionPlayer || !sessionPlayer.session_id || !sessionPlayer.player_id) continue;
      
      // We need to resolve player and session names for UUID mapping
      // For session players, we'll use the stored names if available, or skip if not resolvable
      const playerName = sessionPlayer.player_name;
      const sessionName = sessionPlayer.session_name;
      
      if (!playerName || !sessionName) {
        console.log(`⚠️ Skipping session player - missing name data for resolution`);
        continue;
      }
      
      let playerUuid = playersByName[playerName];
      let sessionUuid = sessionsByName[sessionName];
      
      // If UUID mapping is missing, refresh mappings (handles newly created players/sessions)
      if (!playerUuid || !sessionUuid) {
        console.log(`🔄 Refreshing UUID mappings for missing ${!playerUuid ? 'player' : 'session'}: ${playerName} in ${sessionName}`);
        
        // Refresh player mappings if player UUID is missing
        if (!playerUuid) {
          const { data: refreshedPlayers } = await supabaseClient
            .from(TABLES.PLAYERS)
            .select('id, name');
          
          playersByName = refreshedPlayers?.reduce((acc, p) => {
            acc[p.name] = p.id;
            return acc;
          }, {}) || {};
          
          playerUuid = playersByName[playerName];
        }
        
        // Refresh session mappings if session UUID is missing
        if (!sessionUuid) {
          const { data: refreshedSessions } = await supabaseClient
            .from(TABLES.SESSIONS)
            .select('id, name');
          
          sessionsByName = refreshedSessions?.reduce((acc, s) => {
            acc[s.name] = s.id;
            return acc;
          }, {}) || {};
          
          sessionUuid = sessionsByName[sessionName];
        }
        
        // If still missing after refresh, skip this session player
        if (!playerUuid || !sessionUuid) {
          console.log(`⚠️ Skipping session player - UUID mapping still missing after refresh: ${playerName} in ${sessionName}`);
          continue;
        }
        
        console.log(`✅ UUID mapping resolved: ${playerName} → ${playerUuid}, ${sessionName} → ${sessionUuid}`);
      }
      
      // Ensure peak ELO is at least as high as current ELO to satisfy constraint
      const currentElo = sessionPlayer.session_elo_current || 1200;
      const peakElo = Math.max(sessionPlayer.session_elo_peak || 1200, currentElo);
      
      const sessionPlayerData = {
        session_id: sessionUuid,
        player_id: playerUuid,
        joined_at: sessionPlayer.joined_at ? new Date(sessionPlayer.joined_at) : new Date(),
        left_at: sessionPlayer.left_at ? new Date(sessionPlayer.left_at) : null,
        session_matches: sessionPlayer.session_matches || 0,
        session_wins: sessionPlayer.session_wins || 0,
        session_losses: sessionPlayer.session_losses || 0,
        session_elo_start: sessionPlayer.session_elo_start || 1200,
        session_elo_current: currentElo,
        session_elo_peak: peakElo,
        is_active_in_session: sessionPlayer.is_active_in_session !== false
      };
      
      const existingKey = `${sessionUuid}-${playerUuid}`;
      
      if (existingBySessionAndPlayer[existingKey]) {
        // Update existing session player
        const { error } = await supabaseClient
          .from(TABLES.SESSION_PLAYERS)
          .update(sessionPlayerData)
          .eq('id', existingBySessionAndPlayer[existingKey]);
        
        if (error) {
          console.error('Error updating session player:', playerName, error);
        }
      } else {
        // Insert new session player
        const { error } = await supabaseClient
          .from(TABLES.SESSION_PLAYERS)
          .insert(sessionPlayerData);
        
        if (error && error.code !== '23505') { // Ignore duplicate key errors
          console.error('Error inserting session player:', playerName, error);
        }
      }
    }
    
    console.log(`✅ Session players saved to Supabase`);
  };

  // Delta-based match saving - only process new or changed matches
  const saveMatchesDeltaToSupabase = async (newMatches, previousMatches) => {
    console.log(`🔄 Delta sync: ${newMatches.length} new vs ${previousMatches.length} previous matches`);
    
    // Quick exit if no changes
    if (newMatches.length === previousMatches.length) {
      const hasChanges = newMatches.some((newMatch, index) => {
        const prevMatch = previousMatches[index];
        return !prevMatch || JSON.stringify(newMatch) !== JSON.stringify(prevMatch);
      });
      
      if (!hasChanges) {
        console.log('📝 No changes detected, skipping Supabase sync');
        return;
      }
    }
    
    // Find new matches (not in previous array)
    const previousMatchIds = new Set(previousMatches.map(m => m.id));
    const newMatchesToSync = newMatches.filter(match => !previousMatchIds.has(match.id));
    
    // Find changed matches (same ID but different content)
    const changedMatches = newMatches.filter(newMatch => {
      const prevMatch = previousMatches.find(p => p.id === newMatch.id);
      return prevMatch && JSON.stringify(newMatch) !== JSON.stringify(prevMatch);
    });
    
    const matchesToProcess = [...newMatchesToSync, ...changedMatches];
    
    if (matchesToProcess.length === 0) {
      console.log('📝 No new or changed matches to sync');
      return;
    }
    
    console.log(`💾 Syncing ${matchesToProcess.length} matches (${newMatchesToSync.length} new, ${changedMatches.length} changed)`);
    
    // Get player and session mappings first
    const { data: players } = await supabaseClient
      .from(TABLES.PLAYERS)
      .select('id, name');
    
    const { data: sessions } = await supabaseClient
      .from(TABLES.SESSIONS)
      .select('id, name');
    
    const playersByName = players?.reduce((acc, p) => {
      acc[p.name] = p.id;
      return acc;
    }, {}) || {};
    
    const sessionsByName = sessions?.reduce((acc, s) => {
      acc[s.name] = s.id;
      return acc;
    }, {}) || {};
    
    // Process only the matches that changed
    for (const match of matchesToProcess) {
      if (!match || !match.session_name || !(match.team1_player1_name || match.team1_player1_id)) {
        console.log(`⚠️ Skipping invalid match:`, match?.id);
        continue;
      }
      
      // Skip if we can't resolve all required relationships
      const team1Player1Name = match.team1_player1_name || 'Unknown';
      const team1Player2Name = match.team1_player2_name || 'Unknown';
      const team2Player1Name = match.team2_player1_name || 'Unknown'; 
      const team2Player2Name = match.team2_player2_name || 'Unknown';
      const sessionName = match.session_name || 'Unknown';
      
      if (!playersByName[team1Player1Name] || !playersByName[team1Player2Name] || 
          !playersByName[team2Player1Name] || !playersByName[team2Player2Name] ||
          !sessionsByName[sessionName]) {
        console.log(`⚠️ Skipping match - missing player or session relationships for ${match.id}`);
        continue;
      }
      
      // Check if this is a new match (custom ID) or existing match (UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id);
      
      // Only UPDATE if it's a real UUID from Supabase
      // Temporary IDs should always INSERT (Supabase will generate proper UUID)
      const shouldUpdate = isUUID;
      
      const matchData = {
        session_id: sessionsByName[sessionName],
        court_number: match.court_number || 0,
        started_at: match.started_at ? new Date(match.started_at) : new Date(),
        completed_at: match.completed_at ? new Date(match.completed_at) : null,
        cancelled_at: match.cancelled_at ? new Date(match.cancelled_at) : null,
        team1_player1_id: playersByName[team1Player1Name],
        team1_player2_id: playersByName[team1Player2Name],
        team2_player1_id: playersByName[team2Player1Name],
        team2_player2_id: playersByName[team2Player2Name],
        winning_team: match.winning_team,
        score_team1: match.score_team1,
        score_team2: match.score_team2,
        match_duration_minutes: match.match_duration_minutes,
        match_type: match.match_type || 'doubles',
        notes: match.notes
      };

      let error;
      if (shouldUpdate) {
        // Existing match: UPDATE using UUID
        console.log(`📝 Updating existing match: ${match.id} (UUID: ${isUUID})`);
        
        const { error: updateError } = await supabaseClient
          .from(TABLES.MATCHES)
          .update(matchData)
          .eq('id', match.id);
        
        error = updateError;
        if (error) {
          console.error('❌ Update failed:', error);
        } else {
          console.log(`✅ Updated match: ${match.id}`);
        }
      } else {
        // Temporary ID: Check if there's an existing incomplete match on this court/session to update
        if (match.completed_at || match.cancelled_at) {
          // This is a completed/cancelled match - find existing incomplete match to update
          console.log(`🔍 Looking for existing incomplete match to update (court: ${match.court_number}, session: ${sessionName})`);
          
          const { data: existingIncompleteMatches } = await supabaseClient
            .from(TABLES.MATCHES)
            .select('id')
            .eq('session_id', sessionsByName[sessionName])
            .eq('court_number', match.court_number || 0)
            .is('completed_at', null)
            .is('cancelled_at', null);
          
          if (existingIncompleteMatches && existingIncompleteMatches.length > 0) {
            // Update the existing incomplete match
            const existingMatchId = existingIncompleteMatches[0].id;
            console.log(`📝 Updating existing incomplete match: ${existingMatchId}`);
            
            ({ error } = await supabaseClient
              .from(TABLES.MATCHES)
              .update(matchData)
              .eq('id', existingMatchId));
              
            if (error) {
              console.error('❌ Update failed:', error);
            } else {
              console.log(`✅ Updated existing match: ${existingMatchId}`);
            }
          } else {
            console.log(`⚠️ No existing incomplete match found, inserting new record`);
            ({ error } = await supabaseClient
              .from(TABLES.MATCHES)
              .insert(matchData));
          }
        } else {
          // New incomplete match: INSERT without ID (let Supabase generate UUID)
          console.log(`➕ Inserting new match: ${match.id} (temp ID will be replaced by Supabase UUID)`);
          ({ error } = await supabaseClient
            .from(TABLES.MATCHES)
            .insert(matchData));
          
          if (error) {
            console.error('❌ Insert failed:', error);
          } else {
            console.log(`✅ Inserted new match: ${match.id} (Supabase assigned new UUID)`);
          }
        }
      }
    }
    
    console.log(`✅ Delta sync complete for badminton_matches`);
  };

  // Save matches to Supabase (legacy - kept for other potential callers)
  const saveMatchesToSupabase = async (matches) => {
    console.log(`⚠️ Using legacy saveMatchesToSupabase - consider using delta sync instead`);
    await saveMatchesDeltaToSupabase(matches, []);
  };

  // Save ELO history to Supabase  
  const saveEloHistoryToSupabase = async (eloHistory) => {
    // Get player, session, and match mappings
    const { data: players } = await supabaseClient
      .from(TABLES.PLAYERS)
      .select('id, name');
    
    const { data: sessions } = await supabaseClient
      .from(TABLES.SESSIONS)
      .select('id, name');
    
    const { data: matches } = await supabaseClient
      .from(TABLES.MATCHES)
      .select('id');
    
    const playersByName = players?.reduce((acc, p) => {
      acc[p.name] = p.id;
      return acc;
    }, {}) || {};
    
    const sessionsByName = sessions?.reduce((acc, s) => {
      acc[s.name] = s.id;
      return acc;
    }, {}) || {};
    
    // Create a set of valid match IDs for validation
    const validMatchIds = new Set(matches?.map(m => m.id) || []);
    
    for (const elo of eloHistory) {
      if (!elo || !elo.player_name) continue;
      
      const playerUuid = playersByName[elo.player_name];
      const sessionUuid = sessionsByName[elo.session_name];
      
      if (!playerUuid || !sessionUuid) {
        console.log(`⚠️ Skipping ELO history - missing player or session: ${elo.player_name}`);
        continue;
      }
      
      // Validate match_id if provided
      let matchId = null;
      if (elo.match_id && validMatchIds.has(elo.match_id)) {
        matchId = elo.match_id;
        console.log(`✅ Valid match_id ${elo.match_id} for ELO history of ${elo.player_name}`);
      } else if (elo.match_id) {
        console.log(`⚠️ Invalid match_id ${elo.match_id} for ELO history of ${elo.player_name}, setting to null`);
      } else {
        console.log(`ℹ️ No match_id provided for ELO history of ${elo.player_name}`);
      }
      
      const eloData = {
        player_id: playerUuid,
        match_id: matchId, // Now properly resolved and validated
        session_id: sessionUuid,
        elo_before: elo.elo_before,
        elo_after: elo.elo_after,
        elo_change: elo.elo_change,
        was_winner: elo.was_winner,
        opponent_elo: elo.opponent_elo,
        // New advanced ELO fields
        expected_score: elo.expected_score || null,
        k_factor: elo.k_factor || null,
        player_team_elo: elo.player_team_elo || null,
        opponent_team_elo: elo.opponent_team_elo || null,
        match_count: elo.match_count || null,
        confidence: elo.confidence || null,
        created_at: elo.created_at ? new Date(elo.created_at) : new Date()
      };

      // Insert new ELO record (let Supabase generate UUID)
      const { error } = await supabaseClient
        .from(TABLES.ELO_HISTORY)
        .insert(eloData);
      
      if (error && error.code !== '23505') {
        console.error('Error inserting ELO history:', error);
      }
    }
  };

  // Save courts to Supabase
  const saveCourtsToSupabase = async (courts) => {
    const { data: existingCourts } = await supabaseClient
      .from(TABLES.COURTS)
      .select('id');
    
    const existingIds = existingCourts?.map(c => c.id) || [];
    
    for (const court of courts) {
      if (!court || !court.id) continue;
      
      const courtData = {
        id: court.id,
        session_id: court.session_id,
        court_number: court.court_number,
        name: court.name,
        is_active: court.is_active !== false,
        surface_type: court.surface_type,
        maintenance_status: court.maintenance_status,
        notes: court.notes,
        updated_at: new Date()
      };

      if (existingIds.includes(court.id)) {
        const { error } = await supabaseClient
          .from(TABLES.COURTS)
          .update(courtData)
          .eq('id', court.id);
        
        if (error) {
          console.error('Error updating court:', court.id, error);
        }
      } else {
        const { error } = await supabaseClient
          .from(TABLES.COURTS)
          .insert({ ...courtData, created_at: new Date() });
        
        if (error && error.code !== '23505') {
          console.error('Error inserting court:', court.id, error);
        }
      }
    }
  };

  // Save match events to Supabase
  const saveMatchEventsToSupabase = async (events) => {
    const { data: existingEvents } = await supabaseClient
      .from(TABLES.MATCH_EVENTS)
      .select('id');
    
    const existingIds = existingEvents?.map(e => e.id) || [];
    
    for (const event of events) {
      if (!event || !event.id) continue;
      
      const eventData = {
        id: event.id,
        match_id: event.match_id,
        event_type: event.event_type,
        event_data: event.event_data,
        created_at: event.created_at ? new Date(event.created_at) : new Date(),
        player_id: event.player_id,
        created_by: event.created_by
      };

      if (!existingIds.includes(event.id)) {
        const { error } = await supabaseClient
          .from(TABLES.MATCH_EVENTS)
          .insert(eventData);
        
        if (error && error.code !== '23505') {
          console.error('Error inserting match event:', event.id, error);
        }
      }
    }
  };

  // Save session settings to Supabase
  const saveSessionSettingsToSupabase = async (settings) => {
    const { data: existingSettings } = await supabaseClient
      .from(TABLES.SESSION_SETTINGS)
      .select('id');
    
    const existingIds = existingSettings?.map(s => s.id) || [];
    
    for (const setting of settings) {
      if (!setting || !setting.id) continue;
      
      const settingData = {
        id: setting.id,
        session_id: setting.session_id,
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        setting_type: setting.setting_type,
        created_at: setting.created_at ? new Date(setting.created_at) : new Date(),
        updated_at: new Date()
      };

      if (existingIds.includes(setting.id)) {
        const { error } = await supabaseClient
          .from(TABLES.SESSION_SETTINGS)
          .update(settingData)
          .eq('id', setting.id);
        
        if (error) {
          console.error('Error updating session setting:', setting.id, error);
        }
      } else {
        const { error } = await supabaseClient
          .from(TABLES.SESSION_SETTINGS)
          .insert(settingData);
        
        if (error && error.code !== '23505') {
          console.error('Error inserting session setting:', setting.id, error);
        }
      }
    }
  };

  // Function to reset migration flags (for debugging)
  const resetMigrationFlags = useCallback(() => {
    window.localStorage.removeItem(`${key}_migrated`);
    console.log(`🔄 Reset migration flag for ${key}`);
  }, [key]);

  return [storedValue, setValue, { isLoading, useSupabase, resetMigrationFlags }];
}
