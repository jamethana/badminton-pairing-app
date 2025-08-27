import React, { useState, useEffect, useCallback } from 'react';
import { generateId } from '../utils/helpers';

const EmptyCourtModal = ({ court, availablePool, onFillCourt, onClose }) => {
  const [assignedPlayers, setAssignedPlayers] = useState([]);
  const [remainingPlayers, setRemainingPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAvailablePlayer, setSelectedAvailablePlayer] = useState([]);

  // Initialize with 4 random players when modal opens - only once
  useEffect(() => {
    if (availablePool.length >= 4) {
      const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
      setAssignedPlayers(shuffled.slice(0, 4));
      setRemainingPlayers(shuffled.slice(4));
      setSelectedPlayer(null);
      setSelectedAvailablePlayer(null);
    }
  }, []); // Empty dependency array - only run once

  const handlePlayerClick = (player, index) => {
    if (selectedAvailablePlayer) {
      // Swap mode: replace court player with available player
      swapPlayer(index, selectedAvailablePlayer);
    } else if (!selectedPlayer) {
      // Swap mode: select court player to replace
      setSelectedPlayer({ player, index });
    } else if (selectedPlayer.index === index) {
      // Swap mode: deselect court player
      setSelectedPlayer(null);
    } else {
      // Swap mode: swap two court players
      swapCourtPlayers(selectedPlayer.index, index);
    }
  };

  const handleAvailablePlayerClick = (player) => {
    if (selectedPlayer) {
      // Swap mode: replace selected court player
      swapPlayer(selectedPlayer.index, player);
    } else if (selectedAvailablePlayer?.id === player.id) {
      // Swap mode: deselect available player
      setSelectedAvailablePlayer(null);
    } else {
      // Swap mode: select available player
      setSelectedAvailablePlayer(player);
    }
  };

  const swapPlayer = (courtIndex, newPlayer) => {
    const oldPlayer = assignedPlayers[courtIndex];
    
    setAssignedPlayers(prev => {
      const newAssigned = [...prev];
      newAssigned[courtIndex] = newPlayer;
      return newAssigned;
    });
    
    setRemainingPlayers(prev => {
      const newRemaining = [...prev];
      // Remove new player from available pool
      const newPlayerIndex = newRemaining.findIndex(p => p.id === newPlayer.id);
      if (newPlayerIndex !== -1) {
        newRemaining.splice(newPlayerIndex, 1);
      }
      // Add old player back to available pool
      newRemaining.push(oldPlayer);
      return newRemaining;
    });
    
    // Reset selection
    setSelectedPlayer(null);
    setSelectedAvailablePlayer(null);
  };

  const swapCourtPlayers = (index1, index2) => {
    setAssignedPlayers(prev => {
      const newAssigned = [...prev];
      [newAssigned[index1], newAssigned[index2]] = [newAssigned[index2], newAssigned[index1]];
      return newAssigned;
    });
    setSelectedPlayer(null);
  };

  const handleFillCourt = () => {
    if (assignedPlayers.length !== 4) {
      return;
    }
    
    const match = {
      id: generateId(),
      courtId: court.id,
      team1: {
        player1: assignedPlayers[0],
        player2: assignedPlayers[1]
      },
      team2: {
        player1: assignedPlayers[2],
        player2: assignedPlayers[3]
      },
      startTime: new Date().toISOString(),
      completed: false
    };
    
    onFillCourt(court.id, match);
  };

  if (availablePool.length < 4) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content fill-court-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Fill Court {court.id + 1}</h3>
          </div>
          
          <div className="modal-body">
            <div className="warning-message">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <h4>Not Enough Players</h4>
                <p>You need at least 4 available players to fill this court.</p>
                <div className="player-count">
                  <span className="count-label">Available Players:</span>
                  <span className="count-value">{availablePool.length}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fill-court-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Fill Court {court.id + 1}</h3>
          <p className="modal-subtitle">Click players to swap positions or replace with available players</p>
        </div>
        
        <div className="modal-body">
          {/* Match Preview */}
          <div className="match-preview">
            <h4 className="preview-title">Match Preview</h4>
            
            {/* Team 1 */}
            <div className="team-preview team-1">
              <div className="team-header">
                <h5 className="team-name">Team 1</h5>
                <div className="team-color-indicator team-1-color"></div>
              </div>
              <div className="team-players">
                {assignedPlayers.slice(0, 2).map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`player-slot clickable ${
                      selectedPlayer?.index === index ? 'selected' : ''
                    } ${
                      selectedAvailablePlayer ? 'swap-ready' : ''
                    }`}
                    onClick={() => handlePlayerClick(player, index)}
                  >
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <span className="player-stats">
                        {player.wins}W - {player.losses}L
                      </span>
                    </div>
                    <div className="player-actions">
                      <span className="action-hint">Click to select</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VS Divider */}
            <div className="vs-divider">
              <div className="vs-line"></div>
              <span className="vs-text">VS</span>
              <div className="vs-line"></div>
            </div>

            {/* Team 2 */}
            <div className="team-preview team-2">
              <div className="team-header">
                <h5 className="team-name">Team 2</h5>
                <div className="team-color-indicator team-2-color"></div>
              </div>
              <div className="team-players">
                {assignedPlayers.slice(2, 4).map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`player-slot clickable ${
                      selectedPlayer?.index === index + 2 ? 'selected' : ''
                    } ${
                      selectedAvailablePlayer ? 'swap-ready' : ''
                    }`}
                    onClick={() => handlePlayerClick(player, index + 2)}
                  >
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <span className="player-stats">
                        {player.wins}W - {player.losses}L
                      </span>
                    </div>
                    <div className="player-actions">
                      <span className="action-hint">Click to select</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Available Players Section */}
          <div className="available-players-section">
            <div className="section-header">
              <h5 className="section-title">Available Players</h5>
              <span className="player-count">{remainingPlayers.length} players</span>
            </div>
            
            {remainingPlayers.length > 0 ? (
              <div className="available-players-grid">
                {remainingPlayers.map(player => (
                  <div 
                    key={player.id} 
                    className={`available-player-card clickable ${
                      selectedAvailablePlayer?.id === player.id ? 'selected' : ''
                    } ${
                      selectedPlayer ? 'swap-ready' : ''
                    }`}
                    onClick={() => handleAvailablePlayerClick(player)}
                  >
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <span className="player-stats">
                        {player.wins}W - {player.losses}L
                      </span>
                    </div>
                    <div className="player-actions">
                      <span className="action-hint">
                        {selectedPlayer ? 'Click to swap' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-players-message">
                <p>No available players for swapping</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleFillCourt}
            disabled={selectedPlayer || selectedAvailablePlayer}
          >
            Confirm Match
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmptyCourtModal; 