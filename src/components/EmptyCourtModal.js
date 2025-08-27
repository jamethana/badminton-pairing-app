import React, { useState, useEffect, useCallback } from 'react';
import { generateId } from '../utils/helpers';

const EmptyCourtModal = ({ court, availablePool, onFillCourt, onClose }) => {
  const [assignedPlayers, setAssignedPlayers] = useState([]);
  const [remainingPlayers, setRemainingPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAvailablePlayer, setSelectedAvailablePlayer] = useState(null);

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
      // If an available player is selected, swap with court player
      setAssignedPlayers(prevAssigned => {
        const newAssignedPlayers = [...prevAssigned];
        newAssignedPlayers[index] = selectedAvailablePlayer;
        return newAssignedPlayers;
      });
      
      setRemainingPlayers(prevRemaining => {
        const newRemainingPlayers = [...prevRemaining];
        // Add current court player to remaining
        newRemainingPlayers.push(assignedPlayers[index]);
        // Remove selected available player from remaining
        const targetIndex = newRemainingPlayers.findIndex(p => p.id === selectedAvailablePlayer.id);
        if (targetIndex !== -1) {
          newRemainingPlayers.splice(targetIndex, 1);
        }
        return newRemainingPlayers;
      });
      
      setSelectedAvailablePlayer(null);
    } else if (selectedPlayer === null) {
      // First click - select the court player
      setSelectedPlayer({ player, index });
    } else if (selectedPlayer.index === index) {
      // Click on same player - deselect
      setSelectedPlayer(null);
    } else {
      // Second click - swap players within court
      if (selectedPlayer.index < 4 && index < 4) {
        setAssignedPlayers(prevAssigned => {
          const newAssignedPlayers = [...prevAssigned];
          [newAssignedPlayers[selectedPlayer.index], newAssignedPlayers[index]] = 
            [newAssignedPlayers[index], newAssignedPlayers[selectedPlayer.index]];
          return newAssignedPlayers;
        });
      }
      setSelectedPlayer(null);
    }
  };

  const handleAvailablePlayerClick = (player) => {
    if (selectedAvailablePlayer && selectedAvailablePlayer.id === player.id) {
      // Click on same available player - deselect
      setSelectedAvailablePlayer(null);
    } else if (selectedPlayer) {
      // If a court player is selected, swap with this available player
      setAssignedPlayers(prevAssigned => {
        const newAssignedPlayers = [...prevAssigned];
        newAssignedPlayers[selectedPlayer.index] = player;
        return newAssignedPlayers;
      });
      
      setRemainingPlayers(prevRemaining => {
        const newRemainingPlayers = [...prevRemaining];
        // Add current court player to remaining
        newRemainingPlayers.push(assignedPlayers[selectedPlayer.index]);
        // Remove selected available player from remaining
        const targetIndex = newRemainingPlayers.findIndex(p => p.id === player.id);
        if (targetIndex !== -1) {
          newRemainingPlayers.splice(targetIndex, 1);
        }
        return newRemainingPlayers;
      });
      
      setSelectedPlayer(null);
      setSelectedAvailablePlayer(null);
    } else {
      // Select this available player for swapping
      setSelectedAvailablePlayer(player);
    }
  };

  const handleFillCourt = () => {
    // Create match with assigned players
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
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Fill Court {court.id + 1}</h3>
          </div>
          
          <div className="modal-body">
            <div className="warning-message">
              <p>⚠️ Need at least 4 available players to fill this court.</p>
              <p>Current available: {availablePool.length}</p>
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Fill Court {court.id + 1}</h3>
        </div>
        
        <div className="modal-body">
          <div className="court-preview">
            <h4>Match Preview</h4>
            
            {/* Team 1 */}
            <div className="team-preview">
              <h5>Team 1</h5>
              <div className="team-players">
                {assignedPlayers.slice(0, 2).map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`player-slot clickable ${
                      selectedPlayer?.index === index ? 'selected' : ''
                    }`}
                    onClick={() => handlePlayerClick(player, index)}
                  >
                    {player.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="vs-divider">VS</div>

            {/* Team 2 */}
            <div className="team-preview">
              <h5>Team 2</h5>
              <div className="team-players">
                {assignedPlayers.slice(2, 4).map((player, index) => (
                  <div 
                    key={player.id} 
                    className={`player-slot clickable ${
                      selectedPlayer?.index === index + 2 ? 'selected' : ''
                    }`}
                    onClick={() => handlePlayerClick(player, index + 2)}
                  >
                    {player.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Players for Swapping */}
            <div className="available-players-section">
              <h5>Available Players for Swapping</h5>
              <div className="available-players-grid">
                {remainingPlayers.map(player => (
                  <span 
                    key={player.id} 
                    className={`available-player-tag clickable ${
                      selectedAvailablePlayer?.id === player.id ? 'selected' : ''
                    }`}
                    onClick={() => handleAvailablePlayerClick(player)}
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleFillCourt}>
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