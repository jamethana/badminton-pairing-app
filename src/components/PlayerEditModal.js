import React, { useState, useEffect } from 'react';

const PlayerEditModal = ({ playerId, player, onUpdate, onRemove, onClose }) => {
  const [name, setName] = useState(player.name);
  const [isActive, setIsActive] = useState(player.isActive);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setName(player.name);
    setIsActive(player.isActive);
  }, [player]);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    setHasUnsavedChanges(newName.trim() !== player.name);
  };

  const handleStatusToggle = () => {
    setIsActive(!isActive);
  };

  // Auto-save only status changes (not name changes to avoid typing issues)
  useEffect(() => {
    if (isActive !== player.isActive) {
      onUpdate(playerId, { name: player.name, isActive });
    }
  }, [isActive, player.isActive, player.name, playerId, onUpdate]);

  const handleSave = () => {
    if (name.trim() && name.trim() !== player.name) {
      onUpdate(playerId, { name: name.trim(), isActive });
      setHasUnsavedChanges(false);
      // Instant refresh to ensure changes are synchronized
      window.location.reload();
    }
  };

  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to remove "${player.name}"? This action cannot be undone.`)) {
      onRemove(playerId);
    }
  };

  // Remove auto-save to prevent race conditions and data corruption

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {/* <h3 className="modal-title">
            Manage Player: {player.name}
            {hasUnsavedChanges && <span className="unsaved-indicator"> *</span>}
          </h3> */}
        </div>
        
        <div className="modal-body">
          <div className="player-info-section">
            <div className="info-row">
              {/* <label>Name:</label> */}
              
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={handleNameChange}
              />
            </div>
            
            {/* <div className="info-row">
              <label>Status:</label>
              <div className="status-toggle">
                <button
                  className={`btn ${isActive ? 'btn-success' : 'btn-secondary'}`}
                  onClick={handleStatusToggle}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div> */}
            
            {/* <div className="info-row">
              <label>Match Count:</label>
              <span>{player.matchCount}</span>
            </div>
            
            <div className="info-row">
              <label>Wins:</label>
              <span>{player.wins || 0}</span>
            </div>
            
            <div className="info-row">
              <label>Losses:</label>
              <span>{player.losses || 0}</span>
            </div>
            
            <div className="info-row">
              <label>Last Match:</label>
              <span>
                {player.lastMatchTime 
                  ? new Date(player.lastMatchTime).toLocaleString() 
                  : 'Never'
                }
              </span>
            </div> */}
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            Save Changes
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {/* <button className="btn btn-danger" onClick={handleRemove}>
            Remove Player
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default PlayerEditModal; 