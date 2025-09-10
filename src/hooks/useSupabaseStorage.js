import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient, TABLES } from '../config/supabase';

export function useSupabaseStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue || []);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState(null);
  const [useSupabase, setUseSupabase] = useState(false);

  // Initialize data source and load data
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Special handling for session_players - keep localStorage-only for now
        if (key === 'badminton_session_players') {
          console.log(`📁 Using localStorage only for ${key} (no Supabase sync yet)`);
          setUseSupabase(false);
          loadFromLocalStorage();
          setIsLoading(false);
          return;
        }
        
        // Special handling for ELO history - don't auto-load but keep Supabase sync
        if (key === 'badminton_elo_history') {
          console.log(`📊 ELO history - Supabase sync enabled but not auto-loading`);
          const client = await createSupabaseClient();
          if (client) {
            setSupabaseClient(client);
            setUseSupabase(true);
          }
          setStoredValue(initialValue || []);
          setIsLoading(false);
          return;
        }
        
        // Enable Supabase for other data types
        console.log(`🚀 Enabling full Supabase sync for ${key}`);
        
        
        // First, try to connect to Supabase for other data types
        const client = await createSupabaseClient();
        
        if (client) {
          console.log(`✅ Supabase available for ${key}`);
          setSupabaseClient(client);
          setUseSupabase(true);
          await loadFromSupabase(client, key);
        } else {
          console.log(`📁 Using localStorage for ${key}`);
          setUseSupabase(false);
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error(`Error initializing storage for ${key}:`, error);
        setUseSupabase(false);
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initializeStorage();
  }, [key]);

  // Load data from localStorage
  const loadFromLocalStorage = () => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        setStoredValue(initialValue || []);
        return;
      }

      const parsed = JSON.parse(item);
      
      // Filter out null/undefined items from arrays
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(item => item !== null && item !== undefined);
        setStoredValue(filtered);
      } else {
        setStoredValue(parsed || initialValue || []);
      }
    } catch (error) {
      console.error(`Error loading from localStorage (${key}):`, error);
      setStoredValue(initialValue || []);
    }
  };

  // Load data from Supabase
  const loadFromSupabase = async (client, storageKey) => {
    try {
      const tableName = getSupabaseTable(storageKey);
      if (!tableName) {
        loadFromLocalStorage();
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
        loadFromLocalStorage();
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
      loadFromLocalStorage();
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
      loadFromLocalStorage();
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
        elo: player.current_elo || 100,
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
        isActive: session.is_active !== false,
        courtCount: session.court_count || 4,
        playerIds: [], // Will be populated from session_players table
        courtStates: [], // Will be initialized by App.js
        currentMatches: [], // Will be reconstructed from active matches
        ended_at: session.ended_at
      }));
    } else if (tableName === TABLES.SESSION_PLAYERS) {
      return data.map(sp => ({
        id: sp.id,
        session_id: sp.session_id,
        player_id: sp.player_id,
        joined_at: sp.joined_at,
        left_at: sp.left_at,
        session_matches: sp.session_matches || 0,
        session_wins: sp.session_wins || 0,
        session_losses: sp.session_losses || 0,
        session_elo_start: sp.session_elo_start || 100,
        session_elo_current: sp.session_elo_current || 100,
        session_elo_peak: sp.session_elo_peak || 100,
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
          current_elo: player.elo || 100,
          highest_elo: player.elo || 100,
          lowest_elo: player.elo || 100,
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
          // Saving to Supabase
          await saveToSupabase(cleanedValue);
        } catch (supabaseError) {
          console.warn(`Supabase save failed for ${key}, falling back to localStorage:`, supabaseError);
          // Fallback to localStorage only if Supabase fails
          saveToLocalStorage(cleanedValue);
        }
      } else {
        // Saving to localStorage only
        saveToLocalStorage(cleanedValue);
      }
    } catch (error) {
      console.error(`Error saving data for ${key}:`, error);
      // Fallback: at least save to localStorage
      const fallbackValue = typeof value === 'function' ? value(storedValue) : value;
      saveToLocalStorage(fallbackValue);
      setStoredValue(fallbackValue);
    }
  }, [useSupabase, supabaseClient, storedValue, key]);

  // Save to localStorage
  const saveToLocalStorage = (value) => {
    try {
      if (value === undefined) {
        window.localStorage.removeItem(key);
      } else {
        // Filter out null items before saving
        const cleanValue = Array.isArray(value) 
          ? value.filter(item => item !== null && item !== undefined)
          : value;
        window.localStorage.setItem(key, JSON.stringify(cleanValue));
      }
    } catch (error) {
      console.error(`Error saving to localStorage (${key}):`, error);
    }
  };

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
      
      // Also save to localStorage as backup
    saveToLocalStorage(value);
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
        current_elo: player.elo || 100,
        highest_elo: Math.max(player.elo || 100, player.highest_elo || 100),
        lowest_elo: Math.min(player.elo || 100, player.lowest_elo || 100),
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
    console.log('⚠️ Session players sync temporarily disabled due to UUID constraints');
    console.log('Players will sync, but session relationships will be localStorage only for now');
    
    // TODO: Implement proper UUID mapping between local and Supabase IDs
    // For now, keeping localStorage only to avoid foreign key constraint issues
    return;
  };

  // Save matches to Supabase
  const saveMatchesToSupabase = async (matches) => {
    // Saving matches to Supabase
    
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
    
    // Filter matches to only process relevant ones
    const relevantMatches = matches.filter(match => 
      match && 
      match.session_name && // Has session name
      (match.team1_player1_name || match.team1_player1_id) // Has player data
    );
    
    console.log(`💾 Processing ${relevantMatches.length} relevant matches (filtered from ${matches.length})`);
    
    for (const match of relevantMatches) {
      
      // Skip if we can't resolve all required relationships
      const team1Player1Name = match.team1_player1_name || 'Unknown';
      const team1Player2Name = match.team1_player2_name || 'Unknown';
      const team2Player1Name = match.team2_player1_name || 'Unknown'; 
      const team2Player2Name = match.team2_player2_name || 'Unknown';
      const sessionName = match.session_name || 'Unknown';
      
      if (!playersByName[team1Player1Name] || !playersByName[team1Player2Name] || 
          !playersByName[team2Player1Name] || !playersByName[team2Player2Name] ||
          !sessionsByName[sessionName]) {
        console.log(`⚠️ Skipping match - missing player or session relationships`);
        continue;
      }
      
      // Check if this is a new match (custom ID) or existing match (UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id);
      
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
      if (isUUID) {
        // Existing match: UPDATE using UUID
        console.log(`📝 Updating existing match:`, match.id);
        console.log(`📊 Update data:`, matchData);
        
        const updateResult = await supabaseClient
          .from(TABLES.MATCHES)
          .update(matchData)
          .eq('id', match.id);
        
        error = updateResult.error;
        console.log(`📝 Update result:`, updateResult);
        
        if (error) {
          console.error('❌ Update failed:', error);
        } else {
          console.log(`✅ Update successful for match:`, match.id);
        }
      } else {
        // Custom ID match: Check if there's an existing incomplete match to update
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
          console.log(`➕ Inserting new incomplete match:`, match.id);
          ({ error } = await supabaseClient
            .from(TABLES.MATCHES)
            .insert(matchData));
          
          if (error) {
            console.error('❌ Insert failed:', error);
          } else {
            console.log(`✅ Insert successful for match:`, match.id);
          }
        }
      }
    }
  };

  // Save ELO history to Supabase  
  const saveEloHistoryToSupabase = async (eloHistory) => {
    // Get player and session mappings
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
    
    for (const elo of eloHistory) {
      if (!elo || !elo.player_name) continue;
      
      const playerUuid = playersByName[elo.player_name];
      const sessionUuid = sessionsByName[elo.session_name];
      
      if (!playerUuid || !sessionUuid) {
        console.log(`⚠️ Skipping ELO history - missing player or session: ${elo.player_name}`);
        continue;
      }
      
      const eloData = {
        player_id: playerUuid,
        match_id: null, // We'll skip match_id for now since it's complex to resolve
        session_id: sessionUuid,
        elo_before: elo.elo_before,
        elo_after: elo.elo_after,
        elo_change: elo.elo_change,
        was_winner: elo.was_winner,
        opponent_elo: elo.opponent_elo,
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
