import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Notification from './Notification';

describe('Notification', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should render success notification with correct message', () => {
    render(
      <Notification
        message="Player added successfully!"
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Player added successfully!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('notification', 'success');
  });

  test('should render error notification with correct message', () => {
    render(
      <Notification
        message="Player name already exists"
        type="error"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Player name already exists')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('notification', 'error');
  });

  test('should render warning notification with correct message', () => {
    render(
      <Notification
        message="Need at least 4 players"
        type="warning"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Need at least 4 players')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('notification', 'warning');
  });

  test('should render info notification with correct message', () => {
    render(
      <Notification
        message="Match completed"
        type="info"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Match completed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('notification', 'info');
  });

  test('should default to success type when no type is provided', () => {
    render(
      <Notification
        message="Default notification"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('alert')).toHaveClass('notification', 'success');
  });

  test('should call onClose when close button is clicked', () => {
    render(
      <Notification
        message="Test notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should call onClose when close icon is clicked', () => {
    render(
      <Notification
        message="Test notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    const closeIcon = screen.getByText('×');
    fireEvent.click(closeIcon);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('should auto-close after 3 seconds', async () => {
    render(
      <Notification
        message="Auto-close notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Auto-close notification')).toBeInTheDocument();

    // Fast-forward time by 3 seconds
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  test('should not auto-close before 3 seconds', async () => {
    render(
      <Notification
        message="Auto-close notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Auto-close notification')).toBeInTheDocument();

    // Fast-forward time by 2.9 seconds (less than 3 seconds)
    jest.advanceTimersByTime(2900);

    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  test('should handle long messages', () => {
    const longMessage = 'This is a very long notification message that should be displayed properly without breaking the layout or causing any visual issues. It should wrap correctly and maintain readability.';
    
    render(
      <Notification
        message={longMessage}
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  test('should handle special characters in message', () => {
    const specialMessage = 'Notification with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
    
    render(
      <Notification
        message={specialMessage}
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  test('should handle HTML-like content in message', () => {
    const htmlLikeMessage = 'Message with <strong>HTML-like</strong> content & symbols';
    
    render(
      <Notification
        message={htmlLikeMessage}
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText(htmlLikeMessage)).toBeInTheDocument();
  });

  test('should handle empty message', () => {
    render(
      <Notification
        message=""
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('');
  });

  test('should handle undefined message', () => {
    render(
      <Notification
        message={undefined}
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('should handle null message', () => {
    render(
      <Notification
        message={null}
        type="success"
        onClose={mockOnClose}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('should have proper accessibility attributes', () => {
    render(
      <Notification
        message="Accessible notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    const notification = screen.getByRole('alert');
    expect(notification).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  test('should handle multiple rapid close button clicks', () => {
    render(
      <Notification
        message="Test notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    
    // Click multiple times rapidly
    fireEvent.click(closeButton);
    fireEvent.click(closeButton);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(3);
  });

  test('should handle multiple rapid close icon clicks', () => {
    render(
      <Notification
        message="Test notification"
        type="success"
        onClose={mockOnClose}
      />
    );

    const closeIcon = screen.getByText('×');
    
    // Click multiple times rapidly
    fireEvent.click(closeIcon);
    fireEvent.click(closeIcon);
    fireEvent.click(closeIcon);

    expect(mockOnClose).toHaveBeenCalledTimes(3);
  });
}); 