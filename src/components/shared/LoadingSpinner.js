import React from 'react';

/**
 * Reusable loading spinner component
 * Provides consistent loading UI across the application
 */
const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'medium',
  showIcon = true,
  className = ''
}) => {
  const sizeClasses = {
    small: 'loading-spinner-small',
    medium: 'loading-spinner-medium',
    large: 'loading-spinner-large'
  };

  return (
    <div className={`flex-column-center gap-3 ${sizeClasses[size]} ${className}`}>
      {showIcon && <div className="spinner-icon text-center">🏸</div>}
      <div className="spinner-message text-center text-sm">{message}</div>
    </div>
  );
};

export default LoadingSpinner;
