import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';
import MainApp from './components/MainApp';

/**
 * Main App component with Context Provider
 * Wraps the application with necessary providers and routing
 */
function App() {
  return (
    <GameProvider>
      <Router basename={process.env.NODE_ENV === 'production' ? '/badminton-pairing-app' : ''}>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/:sessionName" element={<MainApp />} />
          {/* Catch-all route for any unmatched URLs - redirect to home */}
          <Route path="*" element={<MainApp />} />
        </Routes>
      </Router>
    </GameProvider>
  );
}

export default App;
