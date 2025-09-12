import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createNewSession, 
  sessionNameToUrl, 
  urlToSessionName 
} from '../utils/helpers';

/**
 * Custom hook for managing session state and operations
 * Handles session selection, creation, navigation, and lifecycle
 */
export function useSessionManagement(sessions, setSessions, currentSessionId, setCurrentSessionId) {
  const navigate = useNavigate();
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);

  // Safe sessions array
  const safeSessions = sessions || [];

  // Find current session - ensure it exists, matches ID, and is active
  const currentSession = currentSessionId ? safeSessions.find(s => 
    s && 
    s.id === currentSessionId && 
    (s.isActive !== false || s.is_active !== false)
  ) : null;

  // Session selection handler
  const handleSessionSelect = useCallback((sessionId) => {
    const session = safeSessions.find(s => s && s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      
      // Navigate to the session URL
      const urlName = sessionNameToUrl(session.name);
      navigate(`/${urlName}`);
      
      return { success: true, message: `Switched to session: ${session.name}` };
    }
    return { success: false, message: 'Session not found' };
  }, [safeSessions, setCurrentSessionId, navigate]);

  // Session creation handler
  const handleSessionCreate = useCallback((newSession) => {
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    
    // Navigate to the new session URL
    const urlName = sessionNameToUrl(newSession.name);
    navigate(`/${urlName}`);
    
    return { success: true, message: `Created new session: ${newSession.name}` };
  }, [setSessions, setCurrentSessionId, navigate]);

  // Session end handler
  const handleSessionEnd = useCallback((sessionId) => {
    const targetSessionId = sessionId || currentSessionId;
    
    // Mark the session as ended (don't delete it completely)
    setSessions(prev => prev.map(session => {
      if (session.id === targetSessionId) {
        return {
          ...session,
          isActive: false,
          is_active: false, // Ensure both fields are set for compatibility
          ended_at: new Date().toISOString(),
          lastActiveAt: new Date().toISOString()
        };
      }
      return session;
    }));
    
    // If ending current session, always go to main menu first
    if (targetSessionId === currentSessionId) {
      setCurrentSessionId(null);
      navigate('/'); // Navigate to home page
      return { success: true, message: 'Session ended - returned to main menu' };
    } else {
      return { success: true, message: 'Session ended' };
    }
  }, [currentSessionId, setSessions, setCurrentSessionId, navigate]);

  // Navigate home handler
  const handleNavigateHome = useCallback(() => {
    setIsNavigatingHome(true);
    setCurrentSessionId(null);
    navigate('/', { replace: true });
    
    // Clear the flag after navigation
    setTimeout(() => setIsNavigatingHome(false), 100);
    
    return { success: true, message: 'Returned to welcome page' };
  }, [setCurrentSessionId, navigate]);

  // Session update function
  const updateSession = useCallback((updates) => {
    console.log('🔧 updateSession called with:', updates);
    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const updatedSession = {
          ...session,
          ...updates,
          lastActiveAt: new Date().toISOString()
        };
        console.log('📝 Updated session:', updatedSession);
        return updatedSession;
      }
      return session;
    }));
  }, [currentSessionId, setSessions]);

  return {
    // State
    currentSession,
    safeSessions,
    isNavigatingHome,
    
    // Handlers
    handleSessionSelect,
    handleSessionCreate,
    handleSessionEnd,
    handleNavigateHome,
    updateSession
  };
}
