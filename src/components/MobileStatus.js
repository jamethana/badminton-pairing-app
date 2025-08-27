import React from 'react';

const MobileStatus = ({ isOnline, syncStatus, onSyncNow }) => {
  return (
    <div className="mobile-status">
      <div className="status-indicators">
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? '🟢' : '🔴'} {isOnline ? 'Online' : 'Offline'}
        </div>
        {isOnline && (
          <div className={`status-indicator ${syncStatus}`}>
            {syncStatus === 'syncing' && '🔄 Syncing...'}
            {syncStatus === 'synced' && '✅ Synced'}
            {syncStatus === 'error' && '❌ Sync Error'}
            {syncStatus === 'idle' && '⏳ Ready to sync'}
          </div>
        )}
      </div>
      
      {isOnline && syncStatus === 'error' && (
        <button 
          className="btn btn-sm btn-outline sync-retry-btn"
          onClick={onSyncNow}
        >
          🔄 Retry Sync
        </button>
      )}
    </div>
  );
};

export default MobileStatus; 