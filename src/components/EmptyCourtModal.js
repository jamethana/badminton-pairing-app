import React, { useState, useEffect, useCallback } from 'react';
import { generateId, getELOTier, formatELODisplay, formatTeamELODisplay } from '../utils/helpers';
import { getMatchPreview } from '../utils/smartMatching';
import Modal from './Modal';

const EmptyCourtModal = ({ court, availablePool, onFillCourt, onClose }) => {
  const [assignedPlayers, setAssignedPlayers] = useState([]);
  const [remainingPlayers, setRemainingPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAvailablePlayer, setSelectedAvailablePlayer] = useState([]);
  const [matchType, setMatchType] = useState('doubles'); // 'singles' or 'doubles'

  // Initialize with players when modal opens - only once
  useEffect(() => {
    const playersNeeded = matchType === 'singles' ? 2 : 4;
    if (availablePool.length >= playersNeeded) {
      const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
      setAssignedPlayers(shuffled.slice(0, playersNeeded));
      setRemainingPlayers(shuffled.slice(playersNeeded));
      setSelectedPlayer(null);
      setSelectedAvailablePlayer(null);
    }
  }, [matchType]); // Re-run when match type changes

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
    const playersNeeded = matchType === 'singles' ? 2 : 4;
    if (assignedPlayers.length !== playersNeeded) {
      return;
    }
    
    let match;
    
    if (matchType === 'singles') {
      match = {
        id: generateId(),
        courtId: court.id,
        matchType: 'singles',
        team1: {
          player1: assignedPlayers[0],
          player2: null
        },
        team2: {
          player1: assignedPlayers[1], 
          player2: null
        },
        startTime: new Date().toISOString(),
        completed: false
      };
    } else {
      match = {
        id: generateId(),
        courtId: court.id,
        matchType: 'doubles',
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
    }
    
    onFillCourt(court.id, match);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleShufflePlayers = () => {
    // Reset any selections first
    setSelectedPlayer(null);
    setSelectedAvailablePlayer(null);
    
    // Combine assigned and remaining players
    const allAvailablePlayers = [...assignedPlayers, ...remainingPlayers];
    
    // Shuffle all players
    const shuffled = [...allAvailablePlayers].sort(() => Math.random() - 0.5);
    
    // Set new assigned players based on match type
    const playersNeeded = matchType === 'singles' ? 2 : 4;
    setAssignedPlayers(shuffled.slice(0, playersNeeded));
    setRemainingPlayers(shuffled.slice(playersNeeded));
  };

  const playersNeeded = matchType === 'singles' ? 2 : 4;
  
  if (availablePool.length < playersNeeded) {
    return (
      <Modal isOpen={true} onClose={onClose} className="court-modal">
        <div className="modal-content fill-court-modal" onClick={(e) => e.stopPropagation()}>
          {/* <div className="modal-header">
            <h3 className="modal-title">Fill Court {court.id + 1}</h3>
          </div> */}
          
          <div className="modal-body">
            <div className="warning-message">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <h4>Not Enough Players</h4>
                <p>You need at least {playersNeeded} available players for {matchType} matches.</p>
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
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} className="court-modal">
      <div className="modal-content fill-court-modal" onClick={(e) => e.stopPropagation()}>
        {/* <div className="modal-header">
          <h3 className="modal-title">Fill Court {court.id + 1}</h3>
        </div> */}
        
        <div className="modal-body">
          {/* Match Preview */}
          <div className="match-preview">
            <div className="preview-header">
              <h4 className="preview-title">Match Preview</h4>
              <div className="match-type-toggle">
                <button 
                  className={`match-type-btn ${matchType === 'singles' ? 'active' : ''}`}
                  onClick={() => setMatchType('singles')}
                >
                  1v1 Singles
                </button>
                <button 
                  className={`match-type-btn ${matchType === 'doubles' ? 'active' : ''}`}
                  onClick={() => setMatchType('doubles')}
                >
                  2v2 Doubles
                </button>
              </div>
            </div>
            
            <div className="teams-container">
              {/* Team 1 */}
              <div className="team-preview team-1">
                <div className="team-players">
                  {assignedPlayers.slice(0, matchType === 'singles' ? 1 : 2).map((player, index) => (
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
                          {/* {player.wins}W - {player.losses}L */}
                          {/* {player.elo} */}
                          {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Team 1 ELO */}
                {matchType === 'doubles' && assignedPlayers.length === 4 && (
                  <div className="team-elo-display">
                    {(() => {
                      const preview = getMatchPreview(
                        assignedPlayers[0],
                        assignedPlayers[1],
                        assignedPlayers[2],
                        assignedPlayers[3]
                      );
                      return <span className="team-elo-number">Rating: {formatTeamELODisplay(assignedPlayers[0], assignedPlayers[1], false)}</span>;
                    })()}
                  </div>
                )}
              </div>

              {/* Small VS Divider */}
              <div className="vs-divider-small">
                <span className="vs-text-small">VS</span>
              </div>

              {/* Team 2 */}
              <div className="team-preview team-2">
                <div className="team-players">
                  {assignedPlayers.slice(matchType === 'singles' ? 1 : 2, matchType === 'singles' ? 2 : 4).map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`player-slot clickable ${
                        selectedPlayer?.index === index + (matchType === 'singles' ? 1 : 2) ? 'selected' : ''
                      } ${
                        selectedAvailablePlayer ? 'swap-ready' : ''
                    }`}
                      onClick={() => handlePlayerClick(player, index + (matchType === 'singles' ? 1 : 2))}
                    >
                      <div className="player-info">
                        <span className="player-name">{player.name}</span>
                        <span className="player-stats">
                          {/* {player.wins}W - {player.losses}L */}
                          {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Team 2 ELO */}
                {matchType === 'doubles' && assignedPlayers.length === 4 && (
                  <div className="team-elo-display">
                    {(() => {
                      const preview = getMatchPreview(
                        assignedPlayers[0],
                        assignedPlayers[1],
                        assignedPlayers[2],
                        assignedPlayers[3]
                      );
                      return <span className="team-elo-number">Rating: {formatTeamELODisplay(assignedPlayers[2], assignedPlayers[3], false)}</span>;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons Between Sections */}
          <div className="modal-actions-middle">
            <button 
              className="btn btn-primary" 
              onClick={handleFillCourt}
              disabled={selectedPlayer || selectedAvailablePlayer}
            >
              Confirm Match
            </button>
            <button 
              className="btn btn-outline shuffle-btn"
              onClick={handleShufflePlayers}
              title="Shuffle players"
              disabled={selectedPlayer || selectedAvailablePlayer}
            >
              🔀 Randomize
            </button>
            <button className="btn btn-outline" onClick={handleCancel}>
              Cancel
            </button>
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
                        {/* {player.wins}W - {player.losses}L */}
                        {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                      </span>
                    </div>
                    <div className="player-actions">
                      {/* <span className="action-hint">
                        {selectedPlayer ? 'Click to swap' : 'Click to select'}
                      </span> */}
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
      </div>
    </Modal>
  );
};

export default EmptyCourtModal; 