import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock the child components
jest.mock('./components/PlayerManagement', () => {
  return function MockPlayerManagement({ players, onAddPlayer, onUpdatePlayer, onRemovePlayer, onResetMatchCounts }) {
    return (
      <div data-testid="player-management">
        <h2>Player Management</h2>
        <button onClick={() => onAddPlayer('Test Player')}>Add Test Player</button>
        <button onClick={() => onUpdatePlayer('1', { name: 'Updated Player' })}>Update Player</button>
        <button onClick={() => onRemovePlayer('1')}>Remove Player</button>
        <button onClick={onResetMatchCounts}>Reset Counts</button>
        <div data-testid="player-count">{players.length} players</div>
      </div>
    );
  };
});

jest.mock('./components/CurrentMatches', () => {
  return function MockCurrentMatches({ 
    currentMatches, 
    courtStates, 
    courtCount, 
    availablePool, 
    onCompleteMatch, 
    onFillCourt, 
    onAddCourt, 
    onRemoveCourt, 
    onGenerateMatches, 
    onClearMatches 
  }) {
    return (
      <div data-testid="current-matches">
        <h2>Current Matches</h2>
        <div data-testid="court-count">{courtCount} courts</div>
        <div data-testid="match-count">{currentMatches.length} matches</div>
        <div data-testid="available-pool">{availablePool.length} available players</div>
        <button onClick={() => onCompleteMatch(0, 'team1')}>Complete Match</button>
        <button onClick={() => onFillCourt(0, { test: 'match' })}>Fill Court</button>
        <button onClick={onAddCourt}>Add Court</button>
        <button onClick={onRemoveCourt}>Remove Court</button>
        <button onClick={onGenerateMatches}>Generate Matches</button>
        <button onClick={onClearMatches}>Clear Matches</button>
      </div>
    );
  };
});

jest.mock('./components/Notification', () => {
  return function MockNotification({ message, type, onClose }) {
    return (
      <div data-testid="notification" className={`notification ${type}`}>
        {message}
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Mock the custom hooks
jest.mock('./hooks/useLocalStorage', () => ({
  useLocalStorage: jest.fn((key, defaultValue) => {
    const mockData = {
      'badminton-players': [
        { id: '1', name: 'Alice', isActive: true, matchCount: 0, wins: 0, losses: 0 },
        { id: '2', name: 'Bob', isActive: true, matchCount: 0, wins: 0, losses: 0 }
      ],
      'badminton-matches': [],
      'badminton-courts': 2,
      'badminton-pool': [
        { id: '1', name: 'Alice', isActive: true, matchCount: 0, wins: 0, losses: 0 },
        { id: '2', name: 'Bob', isActive: true, matchCount: 0, wins: 0, losses: 0 }
      ],
      'badminton-court-states': [
        { id: 0, isOccupied: false, currentMatch: null },
        { id: 1, isOccupied: false, currentMatch: null }
      ]
    };
    
    const mockSetter = jest.fn();
    const value = mockData[key] !== undefined ? mockData[key] : defaultValue;
    
    // Ensure we return an array for destructuring
    if (Array.isArray(value)) {
      return [value, mockSetter];
    } else {
      return [value, mockSetter];
    }
  })
}));

// Mock the helpers
jest.mock('./utils/helpers', () => ({
  generateId: jest.fn(() => 'test-id-123')
}));

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: { reload: jest.fn() },
  writable: true
});

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should render the main app with title', () => {
    render(<App />);

    expect(screen.getByText('🏸 Badminton Pairing App')).toBeInTheDocument();
    expect(screen.getByTestId('player-management')).toBeInTheDocument();
    expect(screen.getByTestId('current-matches')).toBeInTheDocument();
  });

  test('should display correct court count', () => {
    render(<App />);

    expect(screen.getByTestId('court-count')).toHaveTextContent('2 courts');
  });

  test('should display correct player count', () => {
    render(<App />);

    expect(screen.getByTestId('player-count')).toHaveTextContent('2 players');
  });

  test('should display correct available pool count', () => {
    render(<App />);

    expect(screen.getByTestId('available-pool')).toHaveTextContent('2 available players');
  });

  test('should handle adding a player', async () => {
    render(<App />);

    const addButton = screen.getByText('Add Test Player');
    fireEvent.click(addButton);

    // Wait for the notification to appear
    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Player "Test Player" added successfully');
  });

  test('should handle updating a player', async () => {
    render(<App />);

    const updateButton = screen.getByText('Update Player');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Player updated successfully');
  });

  test('should handle removing a player', async () => {
    render(<App />);

    const removeButton = screen.getByText('Remove Player');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Player removed successfully');
  });

  test('should handle resetting match counts', async () => {
    render(<App />);

    const resetButton = screen.getByText('Reset Counts');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('All match counts and history reset');
  });

  test('should handle completing a match', async () => {
    render(<App />);

    const completeButton = screen.getByText('Complete Match');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Team 1 wins!');
  });

  test('should handle filling a court', async () => {
    render(<App />);

    const fillButton = screen.getByText('Fill Court');
    fireEvent.click(fillButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Court filled with selected players');
  });

  test('should handle adding a court', async () => {
    render(<App />);

    const addCourtButton = screen.getByText('Add Court');
    fireEvent.click(addCourtButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Court added');
  });

  test('should handle removing a court', async () => {
    render(<App />);

    const removeCourtButton = screen.getByText('Remove Court');
    fireEvent.click(removeCourtButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Court removed');
  });

  test('should handle generating matches', async () => {
    render(<App />);

    const generateButton = screen.getByText('Generate Matches');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Generated 2 new matches');
  });

  test('should handle clearing matches', async () => {
    render(<App />);

    const clearButton = screen.getByText('Clear Matches');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('All matches cleared');
  });

  test('should handle notification auto-dismissal', async () => {
    render(<App />);

    const addButton = screen.getByText('Add Test Player');
    fireEvent.click(addButton);

    // Wait for notification to appear
    await waitFor(() => {
      expect(screen.getByTestId('notification')).toBeInTheDocument();
    });

    // Fast-forward time by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Notification should auto-dismiss
    await waitFor(() => {
      expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
    });
  });

  test('should handle page refresh after adding player', async () => {
    render(<App />);

    const addButton = screen.getByText('Add Test Player');
    fireEvent.click(addButton);

    // Wait for the 2-second delay
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(window.location.reload).toHaveBeenCalled();
  });

  test('should handle page refresh after removing player', async () => {
    render(<App />);

    const removeButton = screen.getByText('Remove Player');
    fireEvent.click(removeButton);

    // Should refresh immediately
    expect(window.location.reload).toHaveBeenCalled();
  });

  test('should handle page refresh after adding/removing court', async () => {
    render(<App />);

    const addCourtButton = screen.getByText('Add Court');
    fireEvent.click(addCourtButton);

    // Should refresh after 1ms
    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(window.location.reload).toHaveBeenCalled();
  });
}); 