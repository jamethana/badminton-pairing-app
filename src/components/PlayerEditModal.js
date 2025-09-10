import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const PlayerEditModal = ({ playerId, playerName, onSave, onRemove, onClose }) => {
  const [name, setName] = useState(playerName);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setName(playerName);
  }, [playerName]);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    setHasUnsavedChanges(newName.trim() !== playerName);
  };

  const handleSave = () => {
    if (name.trim() && name.trim() !== playerName) {
      onSave(playerId, { name: name.trim() });
      setHasUnsavedChanges(false);
    }
  };

  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to remove "${playerName}"? This action cannot be undone.`)) {
      onRemove(playerId);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} className="player-edit-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            Edit {playerName}
            {hasUnsavedChanges && <span className="unsaved-indicator"> *</span>}
          </h3>
        </div>
        
        <div className="modal-body">
          <div className="player-info-section">
            <div className="info-row">
              <label>Name:</label>
              <input
                type="text"
                className="input-field"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter player name"
              />
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            title={hasUnsavedChanges ? "Save changes" : "No changes to save"}
          >
            {hasUnsavedChanges ? "Save Changes" : "No Changes"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {/* <button className="btn btn-danger" onClick={handleRemove}>
            Remove Player
          </button> */}
        </div>
      </div>
    </Modal>
  );
};

export default PlayerEditModal; 