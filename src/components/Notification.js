import React from 'react';

const Notification = ({ message, type = 'success', onClose }) => {
  return (
    <div className={`notification ${type} flex-between`}>
      <span>{message}</span>
      <button 
        onClick={onClose}
        className="notification-close-btn"
      >
        ×
      </button>
    </div>
  );
};

export default Notification; 