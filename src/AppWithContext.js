import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';
import RefactoredApp from './components/RefactoredApp';

/**
 * Main App component with Context Provider
 * Wraps the application with necessary providers and routing
 */
function AppWithContext() {
  return (
    <GameProvider>
      <Router basename={process.env.NODE_ENV === 'production' ? '/badminton-pairing-app' : ''}>
        <Routes>
          <Route path="/" element={<RefactoredApp />} />
          <Route path="/:sessionName" element={<RefactoredApp />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}

export default AppWithContext;
