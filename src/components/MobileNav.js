import React, { useState } from 'react';

const MobileNav = ({ activeSection, onSectionChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sections = [
    { id: 'matches', label: 'Matches', icon: '🏸' },
    { id: 'players', label: 'Players', icon: '👥' },
    { id: 'courts', label: 'Courts', icon: '🏟️' }
  ];

  const handleSectionChange = (sectionId) => {
    onSectionChange(sectionId);
    setIsExpanded(false);
  };

  return (
    <div className="mobile-nav">
      <div className={`nav-content ${isExpanded ? 'expanded' : ''}`}>
        {sections.map((section) => (
          <button
            key={section.id}
            className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => handleSectionChange(section.id)}
            title={section.label}
          >
            <span className="nav-icon">{section.icon}</span>
            {isExpanded && <span className="nav-label">{section.label}</span>}
          </button>
        ))}
        
        <button
          className="nav-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className="toggle-icon">
            {isExpanded ? '◀' : '▶'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default MobileNav; 