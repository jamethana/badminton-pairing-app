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
  const [touchDragState, setTouchDragState] = useState(null); // Track touch drag state

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
      // Swap mode: replace court player with available player (works for empty slots too)
      swapPlayer(index, selectedAvailablePlayer);
    } else if (!player) {
      // Empty slot clicked - do nothing unless there's a selected available player
      return;
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

  const handleEmptySlotClick = (index) => {
    if (selectedAvailablePlayer) {
      // Place the selected available player in the empty slot
      swapPlayer(index, selectedAvailablePlayer);
    }
    // If no available player is selected, do nothing (empty slot stays empty)
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
    
    // If there's an old player, animate the swap; otherwise just place the new player
    if (oldPlayer) {
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
    } else {
      // No old player, just place the new player
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
        return newRemaining;
      });
    }
    
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
      // Move from assigned to available - replace with null to maintain indexing
      const newAssigned = [...assignedPlayers];
      newAssigned[sourceIndex] = null;
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

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e, player, source, index = null) => {
    e.preventDefault();
    const touch = e.touches[0];
    setTouchDragState({
      player,
      source,
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: false,
      element: e.currentTarget
    });
    setDraggedPlayer({ player, source, index });
  };

  const handleTouchMove = (e) => {
    if (!touchDragState) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchDragState.startX);
    const deltaY = Math.abs(touch.clientY - touchDragState.startY);
    
    // Start dragging if moved more than 10px
    if (!touchDragState.isDragging && (deltaX > 10 || deltaY > 10)) {
      setTouchDragState(prev => ({ ...prev, isDragging: true }));
      // Add visual feedback for dragging
      touchDragState.element.classList.add('touch-dragging');
    }
    
    if (touchDragState.isDragging) {
      setTouchDragState(prev => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY
      }));
      
      // Find element under touch point
      const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elementUnder?.closest('[data-drop-zone]');
      
      if (dropZone) {
        const zone = dropZone.getAttribute('data-drop-zone');
        const index = dropZone.getAttribute('data-drop-index');
        setDragOverZone({ zone, index: index ? parseInt(index) : null });
      } else {
        setDragOverZone(null);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchDragState) return;
    
    e.preventDefault();
    
    // Remove visual feedback
    if (touchDragState.element) {
      touchDragState.element.classList.remove('touch-dragging');
    }
    
    if (touchDragState.isDragging) {
      // Find final drop target
      const elementUnder = document.elementFromPoint(touchDragState.currentX, touchDragState.currentY);
      const dropZone = elementUnder?.closest('[data-drop-zone]');
      
      if (dropZone) {
        const targetZone = dropZone.getAttribute('data-drop-zone');
        const targetIndex = dropZone.getAttribute('data-drop-index');
        
        // Simulate drop
        handleDrop(
          { preventDefault: () => {} },
          targetZone,
          targetIndex ? parseInt(targetIndex) : null
        );
      }
    }
    
    setTouchDragState(null);
    setDragOverZone(null);
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
    <Modal isOpen={true} onClose={onClose} className="court-modal modern-empty-court">
      <div className="modern-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        
        {/* Modern Header */}
        <div className="modern-modal-header">
          <div className="court-info-section">
            <div className="court-badge">
              <span className="court-icon">🏸</span>
              <span className="court-label">Court {court.id + 1}</span>
            </div>
            <div className="match-type-header">
              <div className="match-type-cards">
                <button 
                  className={`match-type-card ${matchType === 'singles' ? 'active' : ''}`}
                  onClick={() => setMatchType('singles')}
                  title="Singles (1 vs 1)"
                >
                  <div className="match-type-icon">👤</div>
                </button>
                <button 
                  className={`match-type-card ${matchType === 'doubles' ? 'active' : ''}`}
                  onClick={() => setMatchType('doubles')}
                  title="Doubles (2 vs 2)"
                >
                  <div className="match-type-icon">👥</div>
                </button>
              </div>
            </div>
          </div>
          <button className="close-btn-modern" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div 
          className="modern-modal-body"
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Match Preview */}
          <div className="match-preview-modern">
            
            <div className="teams-container-modern">
              {/* Team 1 */}
              <div className="team-card team-1">
                <div className="team-header">
                  <span className="team-label">Team 1</span>
                  {matchType === 'doubles' && assignedPlayers.length === 4 && (
                    <div className="team-rating">
                      {(() => {
                        const rating = formatTeamELODisplay(assignedPlayers[0], assignedPlayers[1], false);
                        return <span className="rating-value">{rating}</span>;
                      })()}
                    </div>
                  )}
                </div>
                <div className="team-players-modern">
                  {Array.from({ length: matchType === 'singles' ? 1 : 2 }, (_, index) => {
                    const player = assignedPlayers[index];
                    return (
                      <div 
                        key={player ? player.id : `empty-${index}`} 
                        draggable={player ? "true" : "false"}
                        data-drop-zone="assigned"
                        data-drop-index={index}
                        className={`player-card-modern ${player ? 'clickable draggable' : 'empty-slot'} ${
                          selectedPlayer?.index === index ? 'selected' : ''
                        } ${
                          selectedAvailablePlayer ? 'swap-ready' : ''
                        } ${
                          player && animatingPlayers.has(player.id) ? 'player-flying' : ''
                        } ${
                          dragOverZone?.zone === 'assigned' && dragOverZone?.index === index ? 'drag-over' : ''
                        }`}
                        onClick={() => player ? handlePlayerClick(player, index) : handleEmptySlotClick(index)}
                        onDragStart={player ? (e) => handleDragStart(e, player, 'assigned', index) : undefined}
                        onDragEnd={player ? handleDragEnd : undefined}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, 'assigned', index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'assigned', index)}
                        onTouchStart={player ? (e) => handleTouchStart(e, player, 'assigned', index) : undefined}
                      >
                        {player ? (
                          <>
                            <div className="player-avatar">
                              <span className="avatar-initial">{player.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="player-details">
                              <span className="player-name-modern">{player.name}</span>
                              <span className="player-tier">
                                {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                              </span>
                            </div>
                            <div className="drag-handle">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="9" cy="12" r="1" fill="currentColor"/>
                                <circle cx="15" cy="12" r="1" fill="currentColor"/>
                                <circle cx="9" cy="6" r="1" fill="currentColor"/>
                                <circle cx="15" cy="6" r="1" fill="currentColor"/>
                                <circle cx="9" cy="18" r="1" fill="currentColor"/>
                                <circle cx="15" cy="18" r="1" fill="currentColor"/>
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="empty-slot-content">
                            <div className="empty-slot-icon">+</div>
                            <div className="empty-slot-text">Drop player here</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* Team 2 */}
              <div className="team-card team-2">
                <div className="team-header">
                  <span className="team-label">Team 2</span>
                  {matchType === 'doubles' && assignedPlayers.length === 4 && (
                    <div className="team-rating">
                      {(() => {
                        const rating = formatTeamELODisplay(assignedPlayers[2], assignedPlayers[3], false);
                        return <span className="rating-value">{rating}</span>;
                      })()}
                    </div>
                  )}
                </div>
                <div className="team-players-modern">
                  {Array.from({ length: matchType === 'singles' ? 1 : 2 }, (_, index) => {
                    const actualIndex = index + (matchType === 'singles' ? 1 : 2);
                    const player = assignedPlayers[actualIndex];
                    return (
                      <div 
                        key={player ? player.id : `empty-${actualIndex}`} 
                        draggable={player ? "true" : "false"}
                        data-drop-zone="assigned"
                        data-drop-index={actualIndex}
                        className={`player-card-modern ${player ? 'clickable draggable' : 'empty-slot'} ${
                          selectedPlayer?.index === actualIndex ? 'selected' : ''
                        } ${
                          selectedAvailablePlayer ? 'swap-ready' : ''
                        } ${
                          player && animatingPlayers.has(player.id) ? 'player-flying' : ''
                        } ${
                          dragOverZone?.zone === 'assigned' && dragOverZone?.index === actualIndex ? 'drag-over' : ''
                        }`}
                        onClick={() => player ? handlePlayerClick(player, actualIndex) : handleEmptySlotClick(actualIndex)}
                        onDragStart={player ? (e) => handleDragStart(e, player, 'assigned', actualIndex) : undefined}
                        onDragEnd={player ? handleDragEnd : undefined}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, 'assigned', actualIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, 'assigned', actualIndex)}
                        onTouchStart={player ? (e) => handleTouchStart(e, player, 'assigned', actualIndex) : undefined}
                      >
                        {player ? (
                          <>
                            <div className="player-avatar">
                              <span className="avatar-initial">{player.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="player-details">
                              <span className="player-name-modern">{player.name}</span>
                              <span className="player-tier">
                                {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                              </span>
                            </div>
                            <div className="drag-handle">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="9" cy="12" r="1" fill="currentColor"/>
                                <circle cx="15" cy="12" r="1" fill="currentColor"/>
                                <circle cx="9" cy="6" r="1" fill="currentColor"/>
                                <circle cx="15" cy="6" r="1" fill="currentColor"/>
                                <circle cx="9" cy="18" r="1" fill="currentColor"/>
                                <circle cx="15" cy="18" r="1" fill="currentColor"/>
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="empty-slot-content">
                            <div className="empty-slot-icon">+</div>
                            <div className="empty-slot-text">Drop player here</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Modern Action Controls */}
          <div className="action-controls-modern">
            <div className="primary-actions">
              <button 
                className="btn-modern btn-primary-modern" 
                onClick={handleFillCourt}
                disabled={selectedPlayer || selectedAvailablePlayer}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Start Match
              </button>
              
              <div className="shuffle-section-modern">
                <button 
                  className="btn-modern btn-shuffle-modern"
                  onClick={handleShufflePlayers}
                  title={
                    smartMatching.enabled && matchType === 'doubles' 
                      ? "Smart shuffle - picks from top 25% of good matches" 
                      : "Random shuffle"
                  }
                  disabled={selectedPlayer || selectedAvailablePlayer}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6m-6-10.5a7.5 7.5 0 1 1-10.5 10.5 7.5 7.5 0 0 1 10.5-10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {smartMatching.enabled && matchType === 'doubles' ? 'Smart Shuffle' : 'Dumb Shuffle'}
                </button>
                
                {/* Smart Toggle for doubles */}
                {matchType === 'doubles' && (
                  <div className="smart-toggle-modern">
                    <span className="toggle-label">Smart</span>
                    <label className="i-toggle">
                      <input
                        type="checkbox"
                        checked={smartMatching.enabled}
                        onChange={handleToggleSmartMatching}
                        className="i-toggle-input"
                      />
                      <span className="i-toggle-slider"></span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Available Players Section */}
          <div className="available-players-section-modern">
            <div className="section-header-modern">
              <div className="section-title-modern">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Available Players
              </div>
              <div className="player-count-badge-modern">
                <span className="count-number">{remainingPlayers.length}</span>
                <span className="count-number">players</span>
              </div>
            </div>
            
            {remainingPlayers.length > 0 ? (
              <div className="available-players-grid-modern">
                {remainingPlayers.map(player => (
                  <div 
                    key={player.id} 
                    draggable="true"
                    data-drop-zone="available"
                    className={`available-player-card-modern clickable draggable ${
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
                    onTouchStart={(e) => handleTouchStart(e, player, 'available')}
                  >
                    <div className="player-avatar">
                      <span className="avatar-initial">{player.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="player-details">
                      <span className="player-name-modern">{player.name}</span>
                      <span className="player-tier">
                        {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                      </span>
                    </div>
                    <div className="add-player-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-players-message-modern">
                <div className="empty-state-icon-modern">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <p className="empty-state-title-modern">All players assigned!</p>
                <p className="empty-state-subtitle-modern">Everyone is ready to play 🎉</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmptyCourtModal; 