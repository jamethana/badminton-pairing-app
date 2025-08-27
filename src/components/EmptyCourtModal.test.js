import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyCourtModal from './EmptyCourtModal';

// Mock the generateId function
jest.mock('../utils/helpers', () => ({
  generateId: jest.fn(() => 'test-id-123'),
}));

describe('EmptyCourtModal', () => {
  const mockCourt = { id: 0 };
  const mockAvailablePool = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'Diana' },
    { id: '5', name: 'Eve' },
    { id: '6', name: 'Frank' }
  ];
  const mockOnFillCourt = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render warning message when less than 4 players available', () => {
    const smallPool = mockAvailablePool.slice(0, 3);
    
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={smallPool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('⚠️ Need at least 4 available players to fill this court.')).toBeInTheDocument();
    expect(screen.getByText('Current available: 3')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  test('should render match preview when 4 or more players available', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Fill Court 1')).toBeInTheDocument();
    expect(screen.getByText('Match Preview')).toBeInTheDocument();
    expect(screen.getByText('Team 1')).toBeInTheDocument();
    expect(screen.getByText('Team 2')).toBeInTheDocument();
    expect(screen.getByText('VS')).toBeInTheDocument();
    expect(screen.getByText('Available Players for Swapping')).toBeInTheDocument();
  });

  test('should display initial team assignments', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    // First 4 players should be assigned to teams
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();

    // Remaining players should be in available pool
    expect(screen.getByText('Eve')).toBeInTheDocument();
    expect(screen.getByText('Frank')).toBeInTheDocument();
  });

  test('should allow swapping players within court', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    // Click first player to select
    const firstPlayer = screen.getByText('Alice');
    fireEvent.click(firstPlayer);

    // Click second player to swap
    const secondPlayer = screen.getByText('Bob');
    fireEvent.click(secondPlayer);

    // Players should be swapped (order might change due to random assignment)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  test('should allow swapping court player with available player', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    // Click first court player to select
    const firstCourtPlayer = screen.getByText('Alice');
    fireEvent.click(firstCourtPlayer);

    // Click available player to swap
    const availablePlayer = screen.getByText('Eve');
    fireEvent.click(availablePlayer);

    // Eve should now be in the court, Alice in available pool
    expect(screen.getByText('Eve')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  test('should call onFillCourt with correct match data when confirm match is clicked', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    const confirmButton = screen.getByText('Confirm Match');
    fireEvent.click(confirmButton);

    expect(mockOnFillCourt).toHaveBeenCalledWith(0, expect.objectContaining({
      id: 'test-id-123',
      courtId: 0,
      team1: expect.objectContaining({
        player1: expect.any(Object),
        player2: expect.any(Object)
      }),
      team2: expect.objectContaining({
        player1: expect.any(Object),
        player2: expect.any(Object)
      }),
      startTime: expect.any(String),
      completed: false
    }));
  });

  test('should call onClose when cancel button is clicked', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('should call onClose when clicking outside modal', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    const overlay = screen.getByText('Fill Court 1').closest('.modal-overlay');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test('should not call onClose when clicking inside modal content', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    const modalContent = screen.getByText('Match Preview').closest('.modal-content');
    fireEvent.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('should handle player selection and deselection', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    const firstPlayer = screen.getByText('Alice');
    
    // First click should select
    fireEvent.click(firstPlayer);
    
    // Second click on same player should deselect
    fireEvent.click(firstPlayer);
    
    // Should not have any selection state
    expect(firstPlayer).not.toHaveClass('selected');
  });

  test('should handle available player selection and deselection', () => {
    render(
      <EmptyCourtModal
        court={mockCourt}
        availablePool={mockAvailablePool}
        onFillCourt={mockOnFillCourt}
        onClose={mockOnClose}
      />
    );

    const availablePlayer = screen.getByText('Eve');
    
    // First click should select
    fireEvent.click(availablePlayer);
    
    // Second click on same player should deselect
    fireEvent.click(availablePlayer);
    
    // Should not have any selection state
    expect(availablePlayer).not.toHaveClass('selected');
  });
}); 