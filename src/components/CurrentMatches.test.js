import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CurrentMatches from './CurrentMatches';

// Mock the child components
jest.mock('./CourtOptionsModal', () => {
  return function MockCourtOptionsModal({ court, onCompleteMatch, onClose }) {
    return (
      <div data-testid="court-options-modal">
        <h3>Court Options for Court {court.id + 1}</h3>
        <button onClick={() => onCompleteMatch(court.id, 'team1')}>Team 1 Wins</button>
        <button onClick={() => onCompleteMatch(court.id, 'team2')}>Team 2 Wins</button>
        <button onClick={() => onCompleteMatch(court.id, 'cancelled')}>Cancel Match</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

jest.mock('./EmptyCourtModal', () => {
  return function MockEmptyCourtModal({ court, availablePool, onFillCourt, onClose }) {
    return (
      <div data-testid="empty-court-modal">
        <h3>Fill Court {court.id + 1}</h3>
        <p>Available players: {availablePool.length}</p>
        <button onClick={() => onFillCourt(court.id, { test: 'match-data' })}>Fill Court</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('CurrentMatches', () => {
  const mockProps = {
    currentMatches: [
      {
        id: '1',
        courtId: 0,
        team1: {
          player1: { id: '1', name: 'Alice' },
          player2: { id: '2', name: 'Bob' }
        },
        team2: {
          player1: { id: '3', name: 'Charlie' },
          player2: { id: '4', name: 'Diana' }
        },
        startTime: '2024-01-01T10:00:00Z',
        completed: false
      }
    ],
    courtStates: [
      {
        id: 0,
        isOccupied: true,
        currentMatch: {
          id: '1',
          courtId: 0,
          team1: {
            player1: { id: '1', name: 'Alice' },
            player2: { id: '2', name: 'Bob' }
          },
          team2: {
            player1: { id: '3', name: 'Charlie' },
            player2: { id: '4', name: 'Diana' }
          },
          startTime: '2024-01-01T10:00:00Z',
          completed: false
        }
      },
      {
        id: 1,
        isOccupied: false,
        currentMatch: null
      }
    ],
    courtCount: 2,
    availablePool: [
      { id: '5', name: 'Eve' },
      { id: '6', name: 'Frank' }
    ],
    onCompleteMatch: jest.fn(),
    onFillCourt: jest.fn(),
    onAddCourt: jest.fn(),
    onRemoveCourt: jest.fn(),
    onGenerateMatches: jest.fn(),
    onClearMatches: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render current matches section', () => {
    render(<CurrentMatches {...mockProps} />);

    expect(screen.getByText('Current Matches')).toBeInTheDocument();
    expect(screen.getByText('2 Courts')).toBeInTheDocument();
  });

  test('should render occupied court with match details', () => {
    render(<CurrentMatches {...mockProps} />);

    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
  });

  test('should render empty court with fill message', () => {
    render(<CurrentMatches {...mockProps} />);

    expect(screen.getByText('Court 2')).toBeInTheDocument();
    expect(screen.getByText('Click to fill with players')).toBeInTheDocument();
    expect(screen.getByText('Available: 2 players')).toBeInTheDocument();
  });

  test('should show court options when clicking occupied court', () => {
    render(<CurrentMatches {...mockProps} />);

    const occupiedCourt = screen.getByText('Court 1').closest('.match-card');
    fireEvent.click(occupiedCourt);

    expect(screen.getByTestId('court-options-modal')).toBeInTheDocument();
    expect(screen.getByText('Court Options for Court 1')).toBeInTheDocument();
  });

  test('should show empty court modal when clicking empty court', () => {
    render(<CurrentMatches {...mockProps} />);

    const emptyCourt = screen.getByText('Court 2').closest('.match-card');
    fireEvent.click(emptyCourt);

    expect(screen.getByTestId('empty-court-modal')).toBeInTheDocument();
    expect(screen.getByText('Fill Court 2')).toBeInTheDocument();
  });

  test('should call onCompleteMatch when match is completed', () => {
    render(<CurrentMatches {...mockProps} />);

    const occupiedCourt = screen.getByText('Court 1').closest('.match-card');
    fireEvent.click(occupiedCourt);

    const team1WinsButton = screen.getByText('Team 1 Wins');
    fireEvent.click(team1WinsButton);

    expect(mockProps.onCompleteMatch).toHaveBeenCalledWith(0, 'team1');
  });

  test('should call onFillCourt when court is filled', () => {
    render(<CurrentMatches {...mockProps} />);

    const emptyCourt = screen.getByText('Court 2').closest('.match-card');
    fireEvent.click(emptyCourt);

    const fillCourtButton = screen.getByText('Fill Court');
    fireEvent.click(fillCourtButton);

    expect(mockProps.onFillCourt).toHaveBeenCalledWith(1, { test: 'match-data' });
  });

  test('should call onAddCourt when add court button is clicked', () => {
    render(<CurrentMatches {...mockProps} />);

    const addCourtButton = screen.getByText('Add Court');
    fireEvent.click(addCourtButton);

    expect(mockProps.onAddCourt).toHaveBeenCalled();
  });

  test('should call onRemoveCourt when remove court button is clicked', () => {
    render(<CurrentMatches {...mockProps} />);

    const removeCourtButton = screen.getByText('Remove Court');
    fireEvent.click(removeCourtButton);

    expect(mockProps.onRemoveCourt).toHaveBeenCalled();
  });

  test('should show clear matches confirmation when clear button is clicked', () => {
    render(<CurrentMatches {...mockProps} />);

    const clearButton = screen.getByText('Clear Matches');
    fireEvent.click(clearButton);

    expect(screen.getByText('Are you sure you want to clear all matches?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  test('should call onClearMatches when clear confirmation is confirmed', () => {
    render(<CurrentMatches {...mockProps} />);

    const clearButton = screen.getByText('Clear Matches');
    fireEvent.click(clearButton);

    const confirmButton = screen.getByText('Clear All Matches');
    fireEvent.click(confirmButton);

    expect(mockProps.onClearMatches).toHaveBeenCalled();
  });

  test('should close clear confirmation when cancelled', () => {
    render(<CurrentMatches {...mockProps} />);

    const clearButton = screen.getByText('Clear Matches');
    fireEvent.click(clearButton);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Are you sure you want to clear all matches?')).not.toBeInTheDocument();
  });

  test('should display match start time correctly', () => {
    render(<CurrentMatches {...mockProps} />);

    // The time will be formatted based on the user's locale
    expect(screen.getByText(/Started:/)).toBeInTheDocument();
  });

  test('should handle multiple courts correctly', () => {
    const multiCourtProps = {
      ...mockProps,
      courtCount: 3,
      courtStates: [
        ...mockProps.courtStates,
        {
          id: 2,
          isOccupied: false,
          currentMatch: null
        }
      ]
    };

    render(<CurrentMatches {...multiCourtProps} />);

    expect(screen.getByText('3 Courts')).toBeInTheDocument();
    expect(screen.getByText('Court 3')).toBeInTheDocument();
  });

  test('should close modals when close functions are called', () => {
    render(<CurrentMatches {...mockProps} />);

    // Open empty court modal
    const emptyCourt = screen.getByText('Court 2').closest('.match-card');
    fireEvent.click(emptyCourt);

    expect(screen.getByTestId('empty-court-modal')).toBeInTheDocument();

    // Close it
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('empty-court-modal')).not.toBeInTheDocument();
  });
}); 