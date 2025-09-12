import React from 'react';

const OfflineBlocker = ({ error }) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="offline-blocker">
      <div className="offline-content">
        <div className="offline-icon">📶</div>
        <h1>Internet Connection Required</h1>
        <p className="offline-message">
          This application requires an active internet connection to function properly.
        </p>
        
        {error && (
          <div className="error-details">
            <p><strong>Connection Issue:</strong> {error}</p>
          </div>
        )}
        
        <div className="offline-instructions">
          <h3>To continue:</h3>
          <ul>
            <li>Check your internet connection</li>
            <li>Ensure you're connected to WiFi or mobile data</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
        
        <button 
          className="btn btn-primary retry-btn"
          onClick={handleRefresh}
        >
          🔄 Try Again
        </button>
        
        <div className="connection-status">
          <div className="status-indicator offline">
            <span className="status-dot"></span>
            <span>Offline</span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .offline-blocker {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          color: white;
        }
        
        .offline-content {
          text-align: center;
          max-width: 500px;
          padding: 40px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: slideIn 0.5s ease-out;
        }
        
        .offline-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.8;
          animation: pulse 2s infinite;
        }
        
        .offline-content h1 {
          margin: 0 0 16px 0;
          font-size: 28px;
          font-weight: 600;
        }
        
        .offline-message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 24px;
          opacity: 0.9;
        }
        
        .error-details {
          background: rgba(255, 255, 255, 0.1);
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          border-left: 4px solid #fbbf24;
        }
        
        .offline-instructions {
          text-align: left;
          margin-bottom: 32px;
        }
        
        .offline-instructions h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
        }
        
        .offline-instructions ul {
          margin: 0;
          padding-left: 20px;
        }
        
        .offline-instructions li {
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .retry-btn {
          background: #10b981;
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 24px;
        }
        
        .retry-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .connection-status {
          display: flex;
          justify-content: center;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes slideIn {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default OfflineBlocker;
