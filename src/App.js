import React, { useState, useEffect, useCallback } from 'react';
import PlayerManagement from './components/PlayerManagement';
import CurrentMatches from './components/CurrentMatches';
import Notification from './components/Notification';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateId } from './utils/helpers';

function App() {
  const [players, setPlayers] = useLocalStorage('badminton-players', []);
  const [currentMatches, setCurrentMatches] = useLocalStorage('badminton-matches', []);
  const [courtCount, setCourtCount] = useLocalStorage('badminton-courts', 2);
  const [availablePool, setAvailablePool] = useLocalStorage('badminton-pool', []);
  const [courtStates, setCourtStates] = useLocalStorage('badminton-court-states', []);
  const [notification, setNotification] = useState(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);

  // Initialize court states only on first load
  useEffect(() => {
    if (courtStates.length === 0) {
      initializeCourtStates();
    }
  }, []);

  // Initialize available pool when players change
  useEffect(() => {
    updateAvailablePool();
  }, [players, currentMatches]);

  // Cleanup refresh timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [refreshTimer]);

  const initializeCourtStates = useCallback(() => {
    setCourtStates(prevStates => {
      const newCourtStates = [];
      for (let i = 0; i < courtCount; i++) {
        newCourtStates.push({
          id: i,
          isOccupied: false,
          currentMatch: null
        });
      }
      return newCourtStates;
    });
  }, [courtCount]);

  const updateAvailablePool = useCallback(() => {
    console.log('updateAvailablePool called with players:', players);
    const occupiedPlayerIds = currentMatches.flatMap(match => [
      match.team1.player1.id,
      match.team1.player2.id,
      match.team2.player1.id,
      match.team2.player2.id
    ]);
    
    const available = players.filter(player => 
      player.isActive && !occupiedPlayerIds.includes(player.id)
    );
    setAvailablePool(available);
  }, [players, currentMatches]);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const addPlayer = useCallback((name) => {
    if (!name.trim()) {
      showNotification('Player name cannot be empty', 'error');
      return;
    }
    
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      showNotification('Player name already exists', 'error');
      return;
    }

    setIsAddingPlayer(true);
    
    const newPlayer = {
      id: generateId(),
      name: name.trim(),
      isActive: true,
      matchCount: 0,
      wins: 0,
      losses: 0,
      lastMatchTime: null
    };

    setPlayers(prev => {
      const updated = [...prev, newPlayer];
      return updated;
    });
    
    showNotification(`Player "${name}" added successfully`);
    
    // Clear any existing refresh timer
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    
    // Set new 2-second delay before refresh
    const newTimer = setTimeout(() => {
      window.location.reload();
    }, 5);
    
    setRefreshTimer(newTimer);
  }, [players, showNotification, refreshTimer]);

  const updatePlayer = useCallback((id, updates) => {
    setPlayers(prev => {
      // Defensive check - ensure prev is an array
      if (!Array.isArray(prev)) {
        console.error('Previous state is not an array:', prev);
        return prev;
      }
      
      // Find the player to update
      const playerIndex = prev.findIndex(player => player.id === id);
      if (playerIndex === -1) {
        console.error('Player not found with id:', id);
        return prev;
      }
      
      // Create new array with updated player
      const updated = [...prev];
      updated[playerIndex] = { ...updated[playerIndex], ...updates };
      
      return updated;
    });
    showNotification('Player updated successfully');
  }, [showNotification]);

  const removePlayer = useCallback((id) => {
    setPlayers(prev => prev.filter(player => player.id !== id));
    showNotification('Player removed successfully');
    
    // Instant refresh for player removal
    window.location.reload();
  }, [showNotification]);

  const resetAllMatchCounts = useCallback(() => {
    setPlayers(prev => prev.map(player => ({
      ...player,
      matchCount: 0,
      wins: 0,
      losses: 0,
      lastMatchTime: null
    })));
    
    setCurrentMatches([]);
    setCourtStates(prev => prev.map(court => ({
      ...court,
      isOccupied: false,
      currentMatch: null
    })));
    
    showNotification('All match counts and history reset');
  }, [showNotification]);

  const generateMatches = useCallback(() => {
    if (players.filter(p => p.isActive).length < 4) {
      showNotification('Need at least 4 active players to generate matches', 'error');
      return;
    }

    const activePlayers = players.filter(p => p.isActive);
    const newMatches = [];
    const usedPlayers = new Set();

    // Generate matches for each court
    for (let i = 0; i < courtCount; i++) {
      if (activePlayers.length - usedPlayers.size < 4) break;

      const availablePlayers = activePlayers.filter(p => !usedPlayers.has(p.id));
      const selectedPlayers = [];
      
      // Select 4 random players
      for (let j = 0; j < 4; j++) {
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const player = availablePlayers[randomIndex];
        selectedPlayers.push(player);
        usedPlayers.add(player.id);
        availablePlayers.splice(randomIndex, 1);
      }

      // Find best team formation to avoid repeat partnerships
      const bestFormation = findBestTeamFormation(selectedPlayers, currentMatches);
      
      const match = {
        id: generateId(),
        courtId: i,
        team1: {
          player1: bestFormation.team1[0],
          player2: bestFormation.team1[1]
        },
        team2: {
          player1: bestFormation.team2[0],
          player2: bestFormation.team2[1]
        },
        startTime: new Date().toISOString(),
        completed: false
      };

      newMatches.push(match);
    }

    setCurrentMatches(newMatches);
    
    // Update court states
    const newCourtStates = courtStates.map((court, index) => {
      const match = newMatches.find(m => m.courtId === index);
      return {
        ...court,
        isOccupied: !!match,
        currentMatch: match || null
      };
    });
    setCourtStates(newCourtStates);
    
    showNotification(`Generated ${newMatches.length} new matches`);
  }, [players, courtCount, currentMatches, courtStates, showNotification]);

  const findBestTeamFormation = useCallback((players, previousMatches) => {
    if (previousMatches.length === 0) {
      // First time, just randomize
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      return {
        team1: [shuffled[0], shuffled[1]],
        team2: [shuffled[2], shuffled[3]]
      };
    }

    // Get previous partnerships
    const lastMatch = previousMatches[previousMatches.length - 1];
    const previousPartnerships = new Set();
    
    // Add teammate pairs
    previousPartnerships.add(`${lastMatch.team1.player1.id}-${lastMatch.team1.player2.id}`);
    previousPartnerships.add(`${lastMatch.team2.player1.id}-${lastMatch.team2.player2.id}`);
    
    // Add opponent pairs
    previousPartnerships.add(`${lastMatch.team1.player1.id}-${lastMatch.team2.player1.id}`);
    previousPartnerships.add(`${lastMatch.team1.player1.id}-${lastMatch.team2.player2.id}`);
    previousPartnerships.add(`${lastMatch.team1.player2.id}-${lastMatch.team2.player1.id}`);
    previousPartnerships.add(`${lastMatch.team1.player2.id}-${lastMatch.team2.player2.id}`);

    // Generate all possible formations and score them
    const formations = [];
    const playerIds = players.map(p => p.id);
    
    // Generate all possible 2v2 combinations
    for (let i = 0; i < playerIds.length - 3; i++) {
      for (let j = i + 1; j < playerIds.length - 2; j++) {
        for (let k = j + 1; k < playerIds.length - 1; k++) {
          for (let l = k + 1; l < playerIds.length; l++) {
            const team1 = [players[i], players[j]];
            const team2 = [players[k], players[l]];
            
            let score = 0;
            
            // Check teammate partnerships
            const team1Partnership = `${team1[0].id}-${team1[1].id}`;
            const team2Partnership = `${team2[0].id}-${team2[1].id}`;
            
            if (previousPartnerships.has(team1Partnership)) score += 2;
            if (previousPartnerships.has(team2Partnership)) score += 2;
            
            // Check opponent partnerships
            for (const p1 of team1) {
              for (const p2 of team2) {
                const opponentPair = `${p1.id}-${p2.id}`;
                if (previousPartnerships.has(opponentPair)) score += 1;
              }
            }
            
            formations.push({ team1, team2, score });
          }
        }
      }
    }
    
    // Return the formation with the lowest score (fewest repeat partnerships)
    formations.sort((a, b) => a.score - b.score);
    return formations[0];
  }, []);

  const completeMatch = useCallback((courtId, winner) => {
    const court = courtStates.find(c => c.id === courtId);
    if (!court || !court.currentMatch) return;

    const match = court.currentMatch;
    
    if (winner === 'cancelled') {
      // Match cancelled - no stats recorded
      showNotification('Match cancelled - no stats recorded');
    } else {
      // Update player stats
      const winningTeam = winner === 'team1' ? match.team1 : match.team2;
      const losingTeam = winner === 'team1' ? match.team2 : match.team1;
      
      setPlayers(prev => prev.map(player => {
        if (winningTeam.player1.id === player.id || winningTeam.player2.id === player.id) {
          return { ...player, wins: (player.wins || 0) + 1, matchCount: player.matchCount + 1, lastMatchTime: new Date().toISOString() };
        } else if (losingTeam.player1.id === player.id || losingTeam.player2.id === player.id) {
          return { ...player, losses: (player.losses || 0) + 1, matchCount: player.matchCount + 1, lastMatchTime: new Date().toISOString() };
        }
        return player;
      }));
      
      showNotification(`Team ${winner === 'team1' ? '1' : '2'} wins!`);
    }

    // Clear the court
    setCourtStates(prev => prev.map(c => 
      c.id === courtId ? { ...c, isOccupied: false, currentMatch: null } : c
    ));
    
    setCurrentMatches(prev => prev.filter(m => m.courtId !== courtId));
  }, [courtStates, showNotification]);

  const fillEmptyCourt = useCallback((courtId, matchData = null) => {
    if (matchData) {
      // Use the match data from the modal
      const match = {
        ...matchData,
        id: generateId(),
        courtId,
        startTime: new Date().toISOString(),
        completed: false
      };

      setCurrentMatches(prev => [...prev, match]);
      setCourtStates(prev => prev.map(c => 
        c.id === courtId ? { ...c, isOccupied: true, currentMatch: match } : c
      ));
      
      showNotification('Court filled with selected players');
    } else {
      // Fallback to random selection (existing logic)
      if (availablePool.length < 4) {
        showNotification('Need at least 4 available players to fill court', 'error');
        return;
      }

      const selectedPlayers = [];
      const poolCopy = [...availablePool];
      
      // Select 4 random players
      for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * poolCopy.length);
        selectedPlayers.push(poolCopy[randomIndex]);
        poolCopy.splice(randomIndex, 1);
      }

      // Find best team formation
      const bestFormation = findBestTeamFormation(selectedPlayers, currentMatches);
      
      const match = {
        id: generateId(),
        courtId,
        team1: {
          player1: bestFormation.team1[0],
          player2: bestFormation.team1[1]
        },
        team2: {
          player1: bestFormation.team2[0],
          player2: bestFormation.team2[1]
        },
        startTime: new Date().toISOString(),
        completed: false
      };

      setCurrentMatches(prev => [...prev, match]);
      setCourtStates(prev => prev.map(c => 
        c.id === courtId ? { ...c, isOccupied: true, currentMatch: match } : c
      ));
      
      showNotification('Court filled with random players');
    }
  }, [availablePool, currentMatches, findBestTeamFormation, showNotification]);

  const addCourt = useCallback(() => {
    setCourtStates(prevStates => {
      const newCourtStates = [...prevStates];
      // Add new empty court with a unique ID
      const newCourtId = Math.max(...prevStates.map(c => c.id), -1) + 1;
      newCourtStates.push({
        id: newCourtId,
        isOccupied: false,
        currentMatch: null
      });
      console.log(`Court states updated:`, newCourtStates);
      return newCourtStates;
    });
    
    setCourtCount(prev => prev + 1);
    showNotification('Court added');

    // Force page refresh to ensure state synchronization
    setTimeout(() => {
        window.location.reload();
      }, 1);
  }, [showNotification]);

  const removeCourt = useCallback(() => {
    setCourtStates(prevStates => {
      if (prevStates.length <= 1) {
        showNotification('Cannot remove the last court', 'error');
        return prevStates;
      }
      
      // Check if any court has active players
      const hasActivePlayers = prevStates.some(court => court.isOccupied);
      if (hasActivePlayers) {
        showNotification('Cannot remove courts while there are active matches. Please complete or clear all matches first.', 'error');
        return prevStates;
      }
      
      // Remove last court from courtStates
      const newCourtStates = prevStates.slice(0, -1);
      return newCourtStates;
    });
    
    setCourtCount(prev => Math.max(1, prev - 1));
    showNotification('Court removed');

    // Force page refresh to ensure state synchronization
    setTimeout(() => {
      window.location.reload();
    }, 1);
    
  }, [showNotification]);

  const clearMatches = useCallback(() => {
    setCurrentMatches([]);
    setCourtStates(prev => prev.map(court => ({
      ...court,
      isOccupied: false,
      currentMatch: null
    })));
    showNotification('All matches cleared');
  }, [showNotification]);

  return (
    <div className="App">
      <div className="container">
        <header className="section-header">
          <h1 className="section-title">🏸 Badminton Pairing App</h1>
        </header>

        <CurrentMatches
          currentMatches={currentMatches}
          courtStates={courtStates}
          courtCount={courtCount}
          availablePool={availablePool}
          onCompleteMatch={completeMatch}
          onFillCourt={fillEmptyCourt}
          onAddCourt={addCourt}
          onRemoveCourt={removeCourt}
          onGenerateMatches={generateMatches}
          onClearMatches={clearMatches}
        />

        <PlayerManagement
          players={players}
          isAddingPlayer={isAddingPlayer}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onRemovePlayer={removePlayer}
          onResetMatchCounts={resetAllMatchCounts}
        />

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  );
}

export default App; 