import { useCallback, useEffect, useState } from 'react';
import { createSupabaseClient, TABLES } from '../config/supabase';

/**
 * Efficient individual session player management
 * Handles single player operations without affecting others
 */
export function useSessionPlayer(sessionId, playerId) {
  const [sessionPlayer, setSessionPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supabaseClient, setSupabaseClient] = useState(null);

  // Initialize Supabase client
  useEffect(() => {
    const initClient = async () => {
      const client = await createSupabaseClient();
      setSupabaseClient(client);
    };
    initClient();
  }, []);

  // Load individual session player data
  useEffect(() => {
    if (!sessionId || !playerId || !supabaseClient) {
      setIsLoading(false);
      return;
    }

    const loadSessionPlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabaseClient
          .from(TABLES.SESSION_PLAYERS)
          .select('*')
          .eq('session_id', sessionId)
          .eq('player_id', playerId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw fetchError;
        }

        setSessionPlayer(data || null);
      } catch (err) {
        console.error('Error loading session player:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionPlayer();
  }, [sessionId, playerId, supabaseClient]);

  // Update individual session player
  const updateSessionPlayer = useCallback(async (updates) => {
    if (!sessionId || !playerId || !supabaseClient) {
      return { success: false, message: 'Missing session, player ID, or Supabase client' };
    }

    try {
      const { data, error: updateError } = await supabaseClient
        .from(TABLES.SESSION_PLAYERS)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .eq('player_id', playerId)
        .select()
        .single();

      if (updateError) throw updateError;

      setSessionPlayer(data);
      return { success: true, message: 'Session player updated', data };
    } catch (err) {
      console.error('Error updating session player:', err);
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, [sessionId, playerId, supabaseClient]);

  // Toggle active status efficiently
  const toggleActive = useCallback(async () => {
    if (!sessionPlayer) return { success: false, message: 'No session player found' };

    const newActiveStatus = !sessionPlayer.is_active_in_session;
    console.log(`🔄 Toggling player ${playerId} active status: ${sessionPlayer.is_active_in_session} → ${newActiveStatus}`);

    return await updateSessionPlayer({
      is_active_in_session: newActiveStatus
    });
  }, [sessionPlayer, playerId, updateSessionPlayer]);

  // Create session player relationship
  const createSessionPlayer = useCallback(async (playerData) => {
    if (!sessionId || !playerId || !supabaseClient) {
      return { success: false, message: 'Missing session, player ID, or Supabase client' };
    }

    try {
      const sessionPlayerData = {
        session_id: sessionId,
        player_id: playerId,
        joined_at: new Date().toISOString(),
        session_matches: 0,
        session_wins: 0,
        session_losses: 0,
        session_elo_start: playerData.elo || 1200,
        session_elo_current: playerData.elo || 1200,
        session_elo_peak: playerData.elo || 1200,
        is_active_in_session: true,
        ...playerData
      };

      const { data, error: insertError } = await supabaseClient
        .from(TABLES.SESSION_PLAYERS)
        .insert(sessionPlayerData)
        .select()
        .single();

      if (insertError) throw insertError;

      setSessionPlayer(data);
      return { success: true, message: 'Session player created', data };
    } catch (err) {
      console.error('Error creating session player:', err);
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, [sessionId, playerId, supabaseClient]);

  // Remove from session (mark as inactive and set left_at)
  const removeFromSession = useCallback(async () => {
    return await updateSessionPlayer({
      is_active_in_session: false,
      left_at: new Date().toISOString()
    });
  }, [updateSessionPlayer]);

  return {
    sessionPlayer,
    isLoading,
    error,
    updateSessionPlayer,
    toggleActive,
    createSessionPlayer,
    removeFromSession
  };
}

/**
 * Efficient session players collection management
 * Uses individual player hooks for targeted updates
 */
export function useSessionPlayers(sessionId) {
  const [sessionPlayerIds, setSessionPlayerIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supabaseClient, setSupabaseClient] = useState(null);

  // Initialize Supabase client
  useEffect(() => {
    const initClient = async () => {
      const client = await createSupabaseClient();
      setSupabaseClient(client);
    };
    initClient();
  }, []);

  // Load list of session player IDs
  useEffect(() => {
    if (!sessionId || !supabaseClient) {
      setIsLoading(false);
      return;
    }

    const loadSessionPlayerIds = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabaseClient
          .from(TABLES.SESSION_PLAYERS)
          .select('player_id, is_active_in_session')
          .eq('session_id', sessionId)
          .order('joined_at', { ascending: true });

        if (fetchError) throw fetchError;

        setSessionPlayerIds(data || []);
      } catch (err) {
        console.error('Error loading session player IDs:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionPlayerIds();

    // Set up real-time subscription for session player changes
    // Disabled to prevent WebSocket connection errors
    console.log('📡 Session player realtime subscription disabled to prevent WebSocket errors');
    
    // TODO: Re-enable when realtime is properly configured
    // const subscription = supabaseClient
    //   .channel(`session-players-${sessionId}`)
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*',
    //       schema: 'public',
    //       table: TABLES.SESSION_PLAYERS,
    //       filter: `session_id=eq.${sessionId}`
    //     },
    //     (payload) => {
    //       console.log('🔄 Session player real-time update:', payload);
    //       // Refresh the list when changes occur
    //       loadSessionPlayerIds();
    //     }
    //   )
    //   .subscribe();

    // return () => {
    //   subscription.unsubscribe();
    // };
  }, [sessionId, supabaseClient]);

  return {
    sessionPlayerIds,
    isLoading,
    error
  };
}
