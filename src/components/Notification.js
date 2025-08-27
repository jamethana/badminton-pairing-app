import React from 'react';

const Notification = ({ message, type = 'success', onClose }) => {
  return (
    <div className={`notification ${type}`}>
      {message}
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          marginLeft: '10px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Notification; 