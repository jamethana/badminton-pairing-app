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
  const [isPlayersTabOpen, setIsPlayersTabOpen] = useState(false); // New: Players tab state
  const [dragPreview, setDragPreview] = useState(null); // Track drag preview for mobile
  const [isAutoOpened, setIsAutoOpened] = useState(false); // Track if panel was auto-opened

  // Get smart matching settings
  const smartMatching = currentSession?.smartMatching || {
    enabled: false,
    eloRange: 500,
    teamBalance: 250,
    varietyWeight: 0.2
  };

  // Helper function to auto-open players panel
  const autoOpenPlayersPanel = () => {
    if (!isPlayersTabOpen) {
      setIsPlayersTabOpen(true);
      setIsAutoOpened(true);
    }
  };

  // Helper function to auto-close players panel if it was auto-opened
  const autoClosePlayersPanel = () => {
    if (isAutoOpened && isPlayersTabOpen) {
      setIsPlayersTabOpen(false);
      setIsAutoOpened(false);
    }
  };

  // Handle manual toggle of players panel
  const handleManualToggle = () => {
    setIsPlayersTabOpen(!isPlayersTabOpen);
    setIsAutoOpened(false); // Reset auto-opened flag when manually toggled
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
      // Auto-open players panel when selecting a court player
      autoOpenPlayersPanel();
    } else if (selectedPlayer.index === index) {
      // Swap mode: deselect court player
      setSelectedPlayer(null);
      // Auto-close players panel when deselecting
      autoClosePlayersPanel();
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
    
    // Auto-close players panel after swap
    autoClosePlayersPanel();
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
    
    // Auto-close players panel after swap
    autoClosePlayersPanel();
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
    
    // Add all players to animating set for shuffle animation
    const allPlayerIds = allAvailablePlayers.map(p => p.id);
    setAnimatingPlayers(new Set(allPlayerIds));
    
    // Delay the actual shuffle to show animation
    setTimeout(() => {
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
      
      // Clear animations after shuffle completes
      setTimeout(() => {
        setAnimatingPlayers(new Set());
      }, 300); // Allow time for the shuffle animation to complete
    }, 100); // Small delay to trigger animation
  };

  // Drag and Drop handlers
  const handleDragStart = (e, player, source, index = null) => {
    setDraggedPlayer({ player, source, index });
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
    
    // Auto-open players panel when dragging from court
    if (source === 'assigned') {
      autoOpenPlayersPanel();
    }
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedPlayer(null);
    setDragOverZone(null);
    
    // Auto-close players panel when drag ends
    autoClosePlayersPanel();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, zone, index = null, playerId = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone({ zone, index, playerId });
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag over if we're actually leaving the drop zone
    // Check if the related target is still within the drop zone
    const dropZone = e.currentTarget.closest('[data-drop-zone]');
    const relatedTarget = e.relatedTarget;
    
    if (!dropZone || !dropZone.contains(relatedTarget)) {
      setDragOverZone(null);
    }
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
      // Find which available player was targeted for swap
      const targetElement = document.elementFromPoint(e.clientX || touchDragState?.currentX || 0, e.clientY || touchDragState?.currentY || 0);
      const availablePlayerElement = targetElement?.closest('.available-player-redesigned');
      
      if (availablePlayerElement) {
        // Get the target player ID from the element
        const targetPlayerId = availablePlayerElement.getAttribute('data-player-id');
        const targetPlayer = remainingPlayers.find(p => p.id === targetPlayerId);
        
        if (targetPlayer) {
          // Swap court player with specific available player
          swapPlayer(sourceIndex, targetPlayer);
        } else {
          // Fallback: just move to available if no specific target
          const newAssigned = [...assignedPlayers];
          newAssigned[sourceIndex] = null;
          setAssignedPlayers(newAssigned);
          setRemainingPlayers(prev => [...prev, player]);
        }
      } else {
        // Move from assigned to available - replace with null to maintain indexing
        const newAssigned = [...assignedPlayers];
        newAssigned[sourceIndex] = null;
        setAssignedPlayers(newAssigned);
        setRemainingPlayers(prev => [...prev, player]);
      }
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
    const rect = e.currentTarget.getBoundingClientRect();
    
    setTouchDragState({
      player,
      source,
      index,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: false,
      element: e.currentTarget,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top
    });
    setDraggedPlayer({ player, source, index });
    
    // Auto-open players panel when touch dragging from court
    if (source === 'assigned') {
      autoOpenPlayersPanel();
    }
    
    // Create drag preview
    setDragPreview({
      player,
      x: touch.clientX,
      y: touch.clientY,
      visible: false
    });
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
      
      // Show drag preview
      setDragPreview(prev => ({
        ...prev,
        visible: true
      }));
    }
    
    if (touchDragState.isDragging) {
      setTouchDragState(prev => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY
      }));
      
      // Update drag preview position
      setDragPreview(prev => ({
        ...prev,
        x: touch.clientX - touchDragState.offsetX,
        y: touch.clientY - touchDragState.offsetY
      }));
      
      // Find element under touch point
      const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropZone = elementUnder?.closest('[data-drop-zone]');
      
      if (dropZone) {
        const zone = dropZone.getAttribute('data-drop-zone');
        const index = dropZone.getAttribute('data-drop-index');
        const playerId = dropZone.getAttribute('data-player-id');
        setDragOverZone({ zone, index: index ? parseInt(index) : null, playerId });
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
    setDragPreview(null);
    
    // Auto-close players panel when touch drag ends
    autoClosePlayersPanel();
  };

  const playersNeeded = matchType === 'singles' ? 2 : 4;
  
  if (availablePool.length < playersNeeded) {
    return (
      <Modal isOpen={true} onClose={onClose} className="court-modal">
        <div className="modal-content fill-court-modal" onClick={(e) => e.stopPropagation()}>
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
    <Modal isOpen={true} onClose={onClose} className="court-modal redesigned-empty-court">
      <div className="redesigned-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modern-modal-header">
          <div className="court-info">
            <div className="court-badge-new">
              <span className="court-icon">🏸</span>
              <span className="court-label">Court {court.id + 1}</span>
            </div>
            <div className="match-type-selector">
              <button 
                className={`match-type-btn ${matchType === 'singles' ? 'active' : ''}`}
                onClick={() => setMatchType('singles')}
                title="Singles Match"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Singles
              </button>
              <button 
                className={`match-type-btn ${matchType === 'doubles' ? 'active' : ''}`}
                onClick={() => setMatchType('doubles')}
                title="Doubles Match"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Doubles
              </button>
            </div>
          </div>
          <button className={`close-btn-redesigned ${isPlayersTabOpen ? 'players-tab-open' : ''}`} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className={`redesigned-content ${isPlayersTabOpen ? 'players-tab-open' : ''}`}>
          
          {/* Teams Section - Now More Prominent */}
          <div className="teams-section-redesigned">
            
            {/* Team 1 - Prominent */}
            <div className="team-card-redesigned team-1-redesigned">
              <div className="team-header-redesigned">
                <div className="team-badge">
                  <span className="team-number">1</span>
                  <span className="team-label">Team One</span>
                </div>
                {matchType === 'doubles' && assignedPlayers.length === 4 && (
                  <div className="team-elo-display">
                    {(() => {
                      const rating = formatTeamELODisplay(assignedPlayers[0], assignedPlayers[1], false);
                      return <span className="elo-value">{rating}</span>;
                    })()}
                  </div>
                )}
              </div>
              <div className="team-players-redesigned">
                {Array.from({ length: matchType === 'singles' ? 1 : 2 }, (_, index) => {
                  const player = assignedPlayers[index];
                  return (
                    <div 
                      key={player ? player.id : `empty-${index}`} 
                      draggable={player ? "true" : "false"}
                      data-drop-zone="assigned"
                      data-drop-index={index}
                      className={`player-slot-redesigned ${player ? 'filled' : 'empty'} ${
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
                          <div className="player-avatar-redesigned">
                            <span className="avatar-text">{player.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="player-info-redesigned">
                            <span className="player-name-redesigned">{player.name}</span>
                            <div className="player-stats-redesigned">
                              <span className="player-tier-redesigned">
                                {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                              </span>
                              <span className="player-matches-count">
                                {player.sessionMatchCount || 0} matches
                              </span>
                            </div>
                          </div>
                          <div className="drag-indicator">
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
                        <div className="empty-slot-redesigned">
                          <div className="empty-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5"/>
                              <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <span className="empty-text">Add Player</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VS Divider */}
            <div className="vs-divider-redesigned">
                {/* <span className="vs-text">VS</span> */}
            </div>

            {/* Team 2 - Prominent */}
            <div className="team-card-redesigned team-2-redesigned">
              <div className="team-header-redesigned">
                <div className="team-badge">
                  <span className="team-number">2</span>
                  <span className="team-label">Team Two</span>
                </div>
                {matchType === 'doubles' && assignedPlayers.length === 4 && (
                  <div className="team-elo-display">
                    {(() => {
                      const rating = formatTeamELODisplay(assignedPlayers[2], assignedPlayers[3], false);
                      return <span className="elo-value">{rating}</span>;
                    })()}
                  </div>
                )}
              </div>
              <div className="team-players-redesigned">
                {Array.from({ length: matchType === 'singles' ? 1 : 2 }, (_, index) => {
                  const actualIndex = index + (matchType === 'singles' ? 1 : 2);
                  const player = assignedPlayers[actualIndex];
                  return (
                    <div 
                      key={player ? player.id : `empty-${actualIndex}`} 
                      draggable={player ? "true" : "false"}
                      data-drop-zone="assigned"
                      data-drop-index={actualIndex}
                      className={`player-slot-redesigned ${player ? 'filled' : 'empty'} ${
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
                          <div className="player-avatar-redesigned">
                            <span className="avatar-text">{player.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="player-info-redesigned">
                            <span className="player-name-redesigned">{player.name}</span>
                            <div className="player-stats-redesigned">
                              <span className="player-tier-redesigned">
                                {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                              </span>
                              <span className="player-matches-count">
                                {player.sessionMatchCount || 0} matches
                              </span>
                            </div>
                          </div>
                          <div className="drag-indicator">
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
                        <div className="empty-slot-redesigned">
                          <div className="empty-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5"/>
                              <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          </div>
                          <span className="empty-text">Add Player</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="action-controls-redesigned">
            <button 
              className="btn-start-match" 
              onClick={handleFillCourt}
              disabled={selectedPlayer || selectedAvailablePlayer}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Start Match
            </button>
            
            <button 
              className="btn-shuffle"
              onClick={handleShufflePlayers}
              title={
                smartMatching.enabled && matchType === 'doubles' 
                  ? "Smart shuffle - picks from top 25% of good matches" 
                  : "Random shuffle"
              }
              disabled={selectedPlayer || selectedAvailablePlayer}
            >
              {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6m-6-10.5a7.5 7.5 0 1 1-10.5 10.5 7.5 7.5 0 0 1 10.5-10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
              {smartMatching.enabled && matchType === 'doubles' ? 'Smart Shuffle' : 'Shuffle'}
            </button>
          </div>
        </div>

        {/* Mobile Backdrop for Players Tab */}
        {isPlayersTabOpen && (
          <div 
            className="players-tab-backdrop"
            onClick={() => {
              setIsPlayersTabOpen(false);
              setIsAutoOpened(false); // Reset auto-opened flag when manually closed
            }}
          />
        )}

        {/* Discord-like Players Tab */}
        <div className={`players-tab-redesigned ${isPlayersTabOpen ? 'open' : ''}`}>
          {/* <button 
            className="players-tab-toggle"
            onClick={handleManualToggle}
          >

            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none"
              className={`chevron ${!isPlayersTabOpen ? 'rotated' : ''}`}
            >
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button> */}
          
          <div className="players-tab-content">
            <div className="players-tab-header">
              <h3 className="players-tab-title">Available Players</h3>
              <button 
                className="players-tab-close"
                onClick={() => {
                  setIsPlayersTabOpen(false);
                  setIsAutoOpened(false); // Reset auto-opened flag when manually closed
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="players-list-redesigned">
              {remainingPlayers.length > 0 ? (
                remainingPlayers.map(player => (
                  <div 
                    key={player.id} 
                    draggable="true"
                    data-drop-zone="available"
                    data-player-id={player.id}
                    className={`available-player-redesigned ${
                      selectedAvailablePlayer?.id === player.id ? 'selected' : ''
                    } ${
                      selectedPlayer ? 'swap-ready' : ''
                    } ${
                      animatingPlayers.has(player.id) ? 'player-flying' : ''
                    } ${
                      dragOverZone?.zone === 'available' && dragOverZone?.playerId === player.id ? 'drag-over' : ''
                    }`}
                    onClick={() => handleAvailablePlayerClick(player)}
                    onDragStart={(e) => handleDragStart(e, player, 'available')}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, 'available', null, player.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'available')}
                    onTouchStart={(e) => handleTouchStart(e, player, 'available')}
                  >
                    <div className="available-player-avatar">
                      <span className="avatar-text">{player.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="available-player-info">
                      <span className="available-player-name">{player.name}</span>
                      <span className="available-player-tier">
                        {getELOTier(player.elo, player).icon} {getELOTier(player.elo, player).name}
                      </span>
                      <span className="available-player-matches">
                        {player.session_matches || 0} matches
                      </span>
                    </div>
                    <div className="add-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-available-players">
                  <div className="empty-state-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <p className="empty-title">All players assigned!</p>
                  <p className="empty-subtitle">Everyone is ready to play 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Drag Preview */}
        {dragPreview && dragPreview.visible && (
          <div 
            className="drag-preview"
            style={{
              position: 'fixed',
              left: dragPreview.x,
              top: dragPreview.y,
              pointerEvents: 'none',
              zIndex: 9999,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="drag-preview-card">
              <div className="drag-preview-avatar">
                <span className="avatar-text">{dragPreview.player.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="drag-preview-info">
                <span className="drag-preview-name">{dragPreview.player.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EmptyCourtModal;