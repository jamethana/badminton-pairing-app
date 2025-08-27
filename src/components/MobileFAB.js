import React, { useState } from 'react';

const MobileFAB = ({ onAddPlayer, onGenerateMatches, onAddCourt }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAction = (action) => {
    action();
    setIsExpanded(false);
  };

  return (
    <div className="mobile-fab">
      {isExpanded && (
        <div className="fab-actions">
          <button
            className="fab-action-btn"
            onClick={() => handleAction(onAddPlayer)}
            title="Add Player"
          >
            <span className="fab-icon">👤</span>
            <span className="fab-label">Add Player</span>
          </button>
          
          <button
            className="fab-action-btn"
            onClick={() => handleAction(onGenerateMatches)}
            title="Generate Matches"
          >
            <span className="fab-icon">🏸</span>
            <span className="fab-label">Generate Matches</span>
          </button>
          
          <button
            className="fab-action-btn"
            onClick={() => handleAction(onAddCourt)}
            title="Add Court"
          >
            <span className="fab-icon">🏟️</span>
            <span className="fab-label">Add Court</span>
          </button>
        </div>
      )}
      
      <button
        className={`fab-main-btn ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleExpanded}
        title={isExpanded ? 'Close' : 'Quick Actions'}
      >
        <span className="fab-icon">
          {isExpanded ? '✕' : '⚡'}
        </span>
      </button>
    </div>
  );
};

export default MobileFAB; 