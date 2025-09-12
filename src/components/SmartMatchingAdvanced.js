import React, { useState } from 'react';

const SmartMatchingAdvanced = ({ session, onUpdateSettings }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const smartMatching = session.smartMatching || {
    enabled: false,
    eloRange: 500,
    teamBalance: 250,
    varietyWeight: 0.2
  };

  const handleSettingChange = (key, value) => {
    onUpdateSettings({
      smartMatching: {
        ...smartMatching,
        [key]: value
      }
    });
  };

  return (
    <div className="smart-matching-advanced">
      <div className="advanced-header">
        <div className="advanced-title-group">
          <h4 className="advanced-title">🎯 Smart Matching Settings</h4>
          <div className="advanced-subtitle">Configure intelligent player pairing algorithms</div>
        </div>
        <button
          type="button"
          className="advanced-toggle-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Hide Settings
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Show Settings
            </>
          )}
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-settings">
          <div className="setting-row">
            <label className="setting-label">
              Maximum ELO Difference
              <span className="setting-hint">How far apart player skills can be (100-1000)</span>
            </label>
            <div className="range-input-group">
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={smartMatching.eloRange}
                onChange={(e) => handleSettingChange('eloRange', parseInt(e.target.value))}
                className="range-input"
              />
              <span className="range-value">{smartMatching.eloRange}</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">
              Team Balance Tolerance
              <span className="setting-hint">Maximum team ELO difference (50-500)</span>
            </label>
            <div className="range-input-group">
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={smartMatching.teamBalance}
                onChange={(e) => handleSettingChange('teamBalance', parseInt(e.target.value))}
                className="range-input"
              />
              <span className="range-value">{smartMatching.teamBalance}</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-label">
              Partnership Variety
              <span className="setting-hint">How much to prioritize different partnerships (0-100%)</span>
            </label>
            <div className="range-input-group">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={smartMatching.varietyWeight * 100}
                onChange={(e) => handleSettingChange('varietyWeight', parseInt(e.target.value) / 100)}
                className="range-input"
              />
              <span className="range-value">{(smartMatching.varietyWeight * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="settings-explanation">
            <h5>How Smart Matching Works:</h5>
            <ul>
              <li><strong>Skill Balance:</strong> Matches players with similar ELO ratings</li>
              <li><strong>Team Fairness:</strong> Creates teams with comparable combined ELO</li>
              <li><strong>Partnership Variety:</strong> Avoids repeated partnerships</li>
              <li><strong>Opponent Rotation:</strong> Ensures players face different opponents</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartMatchingAdvanced;
