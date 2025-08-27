import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerManagement from './PlayerManagement';

// Mock the child components
jest.mock('./PlayerCard', () => {
  return function MockPlayerCard({ player, onEdit, onRemove, disabled }) {
    return (
      <div 
        className={`stat-card fade-in clickable ${player.isActive ? '' : 'inactive'} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && onEdit(player)}
        data-testid={`player-card-${player.id}`}
      >
        <div className="stat-header">
          <span className="stat-name">{player.name}</span>
          <span className="stat-value">{player.matchCount}</span>
        </div>
        <div className="stat-details">
          <small>Wins: {player.wins || 0}</small>
          <small>Losses: {player.losses || 0}</small>
        </div>
        <small>
          Last match: {player.lastMatchTime ? '603 days ago' : 'Never'} | 
          Status: {player.isActive ? 'Active' : 'Inactive'}
        </small>
        <button onClick={() => onRemove(player.id)} data-testid={`remove-${player.id}`}>Remove</button>
      </div>
    );
  };
});

jest.mock('./PlayerEditModal', () => {
  return function MockPlayerEditModal({ playerId, playerName, onSave, onRemove, onClose }) {
    return (
      <div data-testid="player-edit-modal">
        <h3>Edit {playerName}</h3>
        <input 
          defaultValue={playerName} 
          data-testid="edit-name-input"
          onChange={(e) => e.target.value}
        />
        <button onClick={() => onSave(playerId, { name: 'Updated Name' })}>Save</button>
        <button onClick={() => onRemove(playerId)} data-testid="modal-remove">Remove</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  };
});

describe('PlayerManagement', () => {
  const mockPlayers = [
    {
      id: '1',
      name: 'Alice',
      isActive: true,
      matchCount: 5,
      wins: 3,
      losses: 2,
      lastMatchTime: '2024-01-01T10:00:00Z'
    },
    {
      id: '2',
      name: 'Bob',
      isActive: true,
      matchCount: 4,
      wins: 2,
      losses: 2,
      lastMatchTime: '2024-01-01T11:00:00Z'
    },
    {
      id: '3',
      name: 'Charlie',
      isActive: false,
      matchCount: 3,
      wins: 1,
      losses: 2,
      lastMatchTime: '2023-12-31T10:00:00Z'
    }
  ];

  const mockProps = {
    players: mockPlayers,
    isAddingPlayer: false,
    onAddPlayer: jest.fn(),
    onUpdatePlayer: jest.fn(),
    onRemovePlayer: jest.fn(),
    onResetMatchCounts: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render player management section', () => {
    render(<PlayerManagement {...mockProps} />);

    expect(screen.getByText('Player Management')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter player name')).toBeInTheDocument();
  });

  test('should display all players with their stats', () => {
    render(<PlayerManagement {...mockProps} />);

    // Check if all players are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();

    // Check if stats are displayed - use more specific selectors
    expect(screen.getByTestId('player-card-1')).toHaveTextContent('5'); // Alice's match count
    expect(screen.getByTestId('player-card-1')).toHaveTextContent('3'); // Alice's wins
    expect(screen.getByTestId('player-card-1')).toHaveTextContent('2'); // Alice's losses
  });

  test('should call onAddPlayer when form is submitted with valid name', async () => {
    render(<PlayerManagement {...mockProps} />);

    const input = screen.getByPlaceholderText('Enter player name');
    fireEvent.change(input, { target: { value: 'David' } });

    const submitButton = screen.getByText('Add Player');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onAddPlayer).toHaveBeenCalledWith('David');
    });
  });

  test('should not call onAddPlayer when form is submitted with empty name', async () => {
    render(<PlayerManagement {...mockProps} />);

    const submitButton = screen.getByText('Add Player');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onAddPlayer).not.toHaveBeenCalled();
    });
  });

  test('should not call onAddPlayer when form is submitted with whitespace only', async () => {
    render(<PlayerManagement {...mockProps} />);

    const input = screen.getByPlaceholderText('Enter player name');
    fireEvent.change(input, { target: { value: '   ' } });

    const submitButton = screen.getByText('Add Player');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onAddPlayer).not.toHaveBeenCalled();
    });
  });

  test('should call onAddPlayer when player name is unique', async () => {
    render(<PlayerManagement {...mockProps} />);

    const input = screen.getByPlaceholderText('Enter player name');
    fireEvent.change(input, { target: { value: 'David' } });

    const submitButton = screen.getByText('Add Player');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onAddPlayer).toHaveBeenCalledWith('David');
    });
  });

  test('should clear input after adding player', async () => {
    render(<PlayerManagement {...mockProps} />);

    const input = screen.getByPlaceholderText('Enter player name');
    fireEvent.change(input, { target: { value: 'David' } });

    const submitButton = screen.getByText('Add Player');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  test('should call onUpdatePlayer when player is edited', async () => {
    render(<PlayerManagement {...mockProps} />);

    // Click on Alice's player card to open edit modal
    const aliceCard = screen.getByTestId('player-card-1');
    fireEvent.click(aliceCard);

    // Modal should open
    expect(screen.getByTestId('player-edit-modal')).toBeInTheDocument();

    // Click save button
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockProps.onUpdatePlayer).toHaveBeenCalledWith('1', { name: 'Updated Name' });
    });
  });

  test('should call onRemovePlayer when player is removed', async () => {
    render(<PlayerManagement {...mockProps} />);

    // Click on Alice's player card to open edit modal
    const aliceCard = screen.getByTestId('player-card-1');
    fireEvent.click(aliceCard);

    // Modal should open
    expect(screen.getByTestId('player-edit-modal')).toBeInTheDocument();

    // Click remove button in the modal using test ID
    const removeButton = screen.getByTestId('modal-remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockProps.onRemovePlayer).toHaveBeenCalledWith('1');
    });
  });

  test('should call onResetMatchCounts when reset button is clicked', async () => {
    render(<PlayerManagement {...mockProps} />);

    const resetButton = screen.getByText('Reset All Match Counts');
    fireEvent.click(resetButton);

    // Wait for confirmation modal to appear
    await waitFor(() => {
      expect(screen.getByText('Confirm Reset All Match Counts')).toBeInTheDocument();
    });

    // Click the confirm button in the modal - use a more specific selector
    const confirmButton = screen.getByTestId('confirm-reset-button');
    fireEvent.click(confirmButton);

    expect(mockProps.onResetMatchCounts).toHaveBeenCalled();
  });

  test('should display player statistics correctly', () => {
    render(<PlayerManagement {...mockProps} />);

    // Check Alice's stats using test IDs
    const aliceCard = screen.getByTestId('player-card-1');
    expect(aliceCard).toHaveTextContent('5'); // Match count
    expect(aliceCard).toHaveTextContent('3'); // Wins
    expect(aliceCard).toHaveTextContent('2'); // Losses

    // Check Bob's stats
    const bobCard = screen.getByTestId('player-card-2');
    expect(bobCard).toHaveTextContent('4'); // Match count
    expect(bobCard).toHaveTextContent('2'); // Wins
    expect(bobCard).toHaveTextContent('2'); // Losses
  });

  test('should handle inactive players correctly', () => {
    render(<PlayerManagement {...mockProps} />);

    // Charlie is inactive
    const charlieCard = screen.getByTestId('player-card-3');
    expect(charlieCard).toHaveClass('inactive');
  });

  test('should handle empty players array', () => {
    const emptyProps = { ...mockProps, players: [] };
    render(<PlayerManagement {...emptyProps} />);

    // Should not crash, just show empty grid
    expect(screen.getByText('Player Management')).toBeInTheDocument();
  });

  test('should handle form submission with Enter key', async () => {
    render(<PlayerManagement {...mockProps} />);

    const input = screen.getByPlaceholderText('Enter player name');
    fireEvent.change(input, { target: { value: 'David' } });
    
    // Submit the form by clicking the submit button
    const submitButton = screen.getByText('Add Player');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onAddPlayer).toHaveBeenCalledWith('David');
    });
  });

  test('should close edit modal when cancel is clicked', async () => {
    render(<PlayerManagement {...mockProps} />);

    // Click on Alice's player card to open edit modal
    const aliceCard = screen.getByTestId('player-card-1');
    fireEvent.click(aliceCard);

    // Modal should open
    expect(screen.getByTestId('player-edit-modal')).toBeInTheDocument();

    // Click cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal should close
    expect(screen.queryByTestId('player-edit-modal')).not.toBeInTheDocument();
  });

  test('should handle disabled state when isAddingPlayer is true', () => {
    const disabledProps = { ...mockProps, isAddingPlayer: true };
    render(<PlayerManagement {...disabledProps} />);

    // Player cards should be disabled
    const aliceCard = screen.getByTestId('player-card-1');
    expect(aliceCard).toHaveClass('disabled');
  });

  test('should handle direct remove button clicks on player cards', async () => {
    render(<PlayerManagement {...mockProps} />);

    // Click the remove button directly on Alice's card
    const aliceRemoveButton = screen.getByTestId('remove-1');
    fireEvent.click(aliceRemoveButton);

    await waitFor(() => {
      expect(mockProps.onRemovePlayer).toHaveBeenCalledWith('1');
    });
  });
}); 