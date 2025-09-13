import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient, TABLES } from '../config/supabase';

/**
 * Session-aware matches hook that only loads matches for the current session
 * This is much more efficient than loading all matches and filtering in memory
 */
export function useSessionMatches(sessionId) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supabaseClient, setSupabaseClient] = useState(null);

  // Initialize Supabase client
  useEffect(() => {
    const initClient = async () => {
      try {
        const client = await createSupabaseClient();
        setSupabaseClient(client);
      } catch (err) {
        console.error('Error initializing Supabase client for matches:', err);
        setError(err.message);
      }
    };
    initClient();
  }, []);

  // Load matches for current session only
  const loadSessionMatches = useCallback(async () => {
    if (!supabaseClient || !sessionId) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔄 Loading matches for session: ${sessionId}`);

      const { data, error: fetchError } = await supabaseClient
        .from(TABLES.MATCHES)
        .select(`
          *,
          sessions!inner(name),
          team1_player1:players!team1_player1_id(id, name),
          team1_player2:players!team1_player2_id(id, name),
          team2_player1:players!team2_player1_id(id, name),
          team2_player2:players!team2_player2_id(id, name)
        `)
        .eq('session_id', sessionId) // Only load matches for current session
        .order('started_at', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Transform data to include player names for compatibility
      const transformedMatches = (data || []).map(match => ({
        ...match,
        session_name: match.sessions?.name,
        team1_player1_name: match.team1_player1?.name,
        team1_player2_name: match.team1_player2?.name,
        team2_player1_name: match.team2_player1?.name,
        team2_player2_name: match.team2_player2?.name
      }));

      console.log(`📥 Loaded ${transformedMatches.length} matches for current session`);
      setMatches(transformedMatches);
    } catch (err) {
      console.error('Error loading session matches:', err);
      setError(err.message);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient, sessionId]);

  // Load matches when session or client changes
  useEffect(() => {
    loadSessionMatches();
  }, [loadSessionMatches]);

  // Set up real-time subscription for match changes in current session
  useEffect(() => {
    if (!supabaseClient || !sessionId) return;

    const subscription = supabaseClient
      .channel(`matches-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.MATCHES,
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('🔄 Match real-time update:', payload);
          // Refresh matches when changes occur
          loadSessionMatches();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient, sessionId, loadSessionMatches]);

  // Add a new match
  const addMatch = useCallback(async (matchData) => {
    if (!supabaseClient || !sessionId) {
      return { success: false, message: 'No Supabase client or session ID' };
    }

    try {
      const { data, error } = await supabaseClient
        .from(TABLES.MATCHES)
        .insert({
          ...matchData,
          session_id: sessionId
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistically update local state
      setMatches(prev => [...prev, data]);
      
      return { success: true, data };
    } catch (err) {
      console.error('Error adding match:', err);
      return { success: false, message: err.message };
    }
  }, [supabaseClient, sessionId]);

  // Update a match
  const updateMatch = useCallback(async (matchId, updates) => {
    if (!supabaseClient) {
      return { success: false, message: 'No Supabase client' };
    }

    try {
      const { data, error } = await supabaseClient
        .from(TABLES.MATCHES)
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      // Optimistically update local state
      setMatches(prev => prev.map(match => 
        match.id === matchId ? { ...match, ...updates } : match
      ));

      return { success: true, data };
    } catch (err) {
      console.error('Error updating match:', err);
      return { success: false, message: err.message };
    }
  }, [supabaseClient]);

  // Bulk update matches (for efficient operations)
  const updateMatches = useCallback((updaterFunction) => {
    setMatches(prev => updaterFunction(prev));
  }, []);

  return {
    matches,
    isLoading,
    error,
    addMatch,
    updateMatch,
    updateMatches,
    refreshMatches: loadSessionMatches
  };
}
