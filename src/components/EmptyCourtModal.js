import React, { useState, useEffect, useCallback } from 'react';
import { generateId, getELOTier, formatELODisplay, formatTeamELODisplay } from '../utils/helpers';
import { getMatchPreview, generateSmartMatch } from '../utils/smartMatching';
import Modal from './Modal';

const EmptyCourtModal = ({ court, availablePool, currentSession, onFillCourt, onClose, onUpdateSession }) => {
  const [assignedPlayers, setAssignedPlayers] = useState([]);
  const [remainingPlayers, setRemainingPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAvailablePlayer, setSelectedAvailablePlayer] = useState([]);
  const [matchType, setMatchType] = useState('doubles'); // 'singles' or 'doubles'
  const [animatingPlayers, setAnimatingPlayers] = useState(new Set()); // Track which players are animating
  const [draggedPlayer, setDraggedPlayer] = useState(null); // Track dragged player
  const [dragOverZone, setDragOverZone] = useState(null); // Track drag over zones

  // Get smart matching settings
  const smartMatching = currentSession?.smartMatching || {
    enabled: false,
    eloRange: 500,
    teamBalance: 250,
    varietyWeight: 0.2
  };

  // Handle smart matching toggle
  const handleToggleSmartMatching = () => {
    if (onUpdateSession) {
      const newSettings = {
        smartMatching: {
          ...smartMatching,
          enabled: !smartMatching.enabled
        }
      };
      onUpdateSession(newSettings);
    }
  };

  // Animation helper function
  const animateSwap = (playerIds, callback) => {
    // Add players to animating set
    setAnimatingPlayers(prev => {
      const newSet = new Set(prev);
      playerIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    // Execute the swap after a short delay for animation
    setTimeout(() => {
      callback();
      // Remove players from animating set after animation completes
      setTimeout(() => {
        setAnimatingPlayers(prev => {
          const newSet = new Set(prev);
          playerIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }, 200); // Match animation duration
    }, 50); // Small delay to trigger animation
  };

  // Initialize with players when modal opens or when smart matching setting changes
  useEffect(() => {
    const playersNeeded = matchType === 'singles' ? 2 : 4;
    if (availablePool.length >= playersNeeded) {
      if (smartMatching.enabled && matchType === 'doubles') {
        // Use smart matching for doubles (no randomness on initial load)
        const matches = currentSession?.currentMatches || [];
        const smartSelection = generateSmartMatch(availablePool, matches, true, false);
        
        if (smartSelection && smartSelection.players) {
          setAssignedPlayers(smartSelection.players);
          const remainingPool = availablePool.filter(p => 
            !smartSelection.players.some(sp => sp.id === p.id)
          );
          setRemainingPlayers(remainingPool);
        } else {
          // Fallback to random if smart matching fails
          const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
          setAssignedPlayers(shuffled.slice(0, playersNeeded));
          setRemainingPlayers(shuffled.slice(playersNeeded));
        }
      } else {
        // Use random selection for singles or when smart matching is disabled
        const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
        setAssignedPlayers(shuffled.slice(0, playersNeeded));
        setRemainingPlayers(shuffled.slice(playersNeeded));
      }
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
    
    // Animate the swap
    animateSwap([oldPlayer.id, newPlayer.id], () => {
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
    });
    
    // Reset selection
    setSelectedPlayer(null);
    setSelectedAvailablePlayer(null);
  };

  const swapCourtPlayers = (index1, index2) => {
    const player1 = assignedPlayers[index1];
    const player2 = assignedPlayers[index2];
    
    // Animate the swap
    animateSwap([player1.id, player2.id], () => {
      setAssignedPlayers(prev => {
        const newAssigned = [...prev];
        [newAssigned[index1], newAssigned[index2]] = [newAssigned[index2], newAssigned[index1]];
        return newAssigned;
      });
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
    const playersNeeded = matchType === 'singles' ? 2 : 4;
    
    if (smartMatching.enabled && matchType === 'doubles') {
      // Use smart matching with randomness for shuffle - this adds variety!
      const matches = currentSession?.currentMatches || [];
      const smartSelection = generateSmartMatch(allAvailablePlayers, matches, true, true);
      
      if (smartSelection && smartSelection.players) {
        setAssignedPlayers(smartSelection.players);
        const remainingPool = allAvailablePlayers.filter(p => 
          !smartSelection.players.some(sp => sp.id === p.id)
        );
        setRemainingPlayers(remainingPool);
      } else {
        // Fallback to random shuffle
        const shuffled = [...allAvailablePlayers].sort(() => Math.random() - 0.5);
        setAssignedPlayers(shuffled.slice(0, playersNeeded));
        setRemainingPlayers(shuffled.slice(playersNeeded));
      }
    } else {
      // Use random shuffle for singles or when smart matching is disabled
      const shuffled = [...allAvailablePlayers].sort(() => Math.random() - 0.5);
      setAssignedPlayers(shuffled.slice(0, playersNeeded));
      setRemainingPlayers(shuffled.slice(playersNeeded));
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, player, source, index = null) => {
    setDraggedPlayer({ player, source, index });
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedPlayer(null);
    setDragOverZone(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, zone, index = null) => {
    e.preventDefault();
    setDragOverZone({ zone, index });
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverZone(null);
  };

  const handleDrop = (e, targetZone, targetIndex = null) => {
    e.preventDefault();
    setDragOverZone(null);
    
    if (!draggedPlayer) return;
    
    const { player, source, index: sourceIndex } = draggedPlayer;
    
    // Handle different drop scenarios
    if (source === 'assigned' && targetZone === 'assigned' && sourceIndex !== targetIndex) {
      // Swap players within assigned team
      swapCourtPlayers(sourceIndex, targetIndex);
    } else if (source === 'assigned' && targetZone === 'available') {
      // Move from assigned to available
      const newAssigned = [...assignedPlayers];
      newAssigned.splice(sourceIndex, 1);
      setAssignedPlayers(newAssigned);
      setRemainingPlayers(prev => [...prev, player]);
    } else if (source === 'available' && targetZone === 'assigned') {
      // Replace assigned player with available player
      if (targetIndex !== null) {
        swapPlayer(targetIndex, player);
      }
    }
    
    setDraggedPlayer(null);
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
                      draggable="true"
                      className={`player-slot clickable draggable ${
                        selectedPlayer?.index === index ? 'selected' : ''
                      } ${
                        selectedAvailablePlayer ? 'swap-ready' : ''
                      } ${
                        animatingPlayers.has(player.id) ? 'player-flying' : ''
                      } ${
                        dragOverZone?.zone === 'assigned' && dragOverZone?.index === index ? 'drag-over' : ''
                      }`}
                      onClick={() => handlePlayerClick(player, index)}
                      onDragStart={(e) => handleDragStart(e, player, 'assigned', index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, 'assigned', index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'assigned', index)}
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
                  {assignedPlayers.slice(matchType === 'singles' ? 1 : 2, matchType === 'singles' ? 2 : 4).map((player, index) => {
                    const actualIndex = index + (matchType === 'singles' ? 1 : 2);
                    return (
                    <div 
                      key={player.id} 
                      draggable="true"
                      className={`player-slot clickable draggable ${
                        selectedPlayer?.index === actualIndex ? 'selected' : ''
                      } ${
                        selectedAvailablePlayer ? 'swap-ready' : ''
                      } ${
                        animatingPlayers.has(player.id) ? 'player-flying' : ''
                      } ${
                        dragOverZone?.zone === 'assigned' && dragOverZone?.index === actualIndex ? 'drag-over' : ''
                    }`}
                      onClick={() => handlePlayerClick(player, actualIndex)}
                      onDragStart={(e) => handleDragStart(e, player, 'assigned', actualIndex)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, 'assigned', actualIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 'assigned', actualIndex)}
                    >
                      <div className="player-info">
                        <span className="player-name">{player.name}</span>
                        <span className="player-stats">
                          {/* {player.wins}W - {player.losses}L */}
                          {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                        </span>
                      </div>
                    </div>
                    );
                  })}
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
            
            <div className="shuffle-controls">
              <button 
                className="btn btn-outline shuffle-btn"
                onClick={handleShufflePlayers}
                title={
                  smartMatching.enabled && matchType === 'doubles' 
                    ? "Smart shuffle - picks from top 25% of good matches" 
                    : "Random shuffle"
                }
                disabled={selectedPlayer || selectedAvailablePlayer}
              >
                Shuffle
              </button>
              
              {/* Inline Smart Matching Toggle - only show for doubles */}
              {matchType === 'doubles' && (
                <div className="smart-toggle-inline">
                  <div className="smart-label-stack">
                    <span className="smart-label-top">Smart</span>
                    <span className="smart-label-bottom">Shuffle</span>
                  </div>
                  <label className="iphone-toggle">
                    <input
                      type="checkbox"
                      checked={smartMatching.enabled}
                      onChange={handleToggleSmartMatching}
                      className="iphone-toggle-input"
                    />
                    <span className="iphone-toggle-slider"></span>
                  </label>
                </div>
              )}
            </div>
            
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
                    draggable="true"
                    className={`available-player-card clickable draggable ${
                      selectedAvailablePlayer?.id === player.id ? 'selected' : ''
                    } ${
                      selectedPlayer ? 'swap-ready' : ''
                    } ${
                      animatingPlayers.has(player.id) ? 'player-flying' : ''
                    } ${
                      dragOverZone?.zone === 'available' ? 'drag-over' : ''
                    }`}
                    onClick={() => handleAvailablePlayerClick(player)}
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, 'available')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'available')}
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
                <div className="empty-state-icon">👥</div>
                <p className="empty-state-title">All players assigned!</p>
                <p className="empty-state-subtitle">Everyone is ready to play</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmptyCourtModal; 