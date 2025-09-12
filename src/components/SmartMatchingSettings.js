import React, { useState } from 'react';

const SmartMatchingSettings = ({ session, onUpdateSettings }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const smartMatching = session.smartMatching || {
    enabled: false,
    eloRange: 500,
    teamBalance: 250,
    varietyWeight: 0.2
  };

  const handleToggleEnabled = () => {
    console.log('🎯 Smart matching toggle clicked! Current state:', smartMatching.enabled);
    const newSettings = {
      smartMatching: {
        ...smartMatching,
        enabled: !smartMatching.enabled
      }
    };
    console.log('🎯 Calling onUpdateSettings with:', newSettings);
    onUpdateSettings(newSettings);
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
    <div className="smart-matching-settings">
      <div className="setting-group">
        <div className="setting-header">
          <div className="setting-label">
            <span className="setting-title">🎯 Smart Matching </span>
            <label className="iphone-toggle">
              <input
                type="checkbox"
                checked={smartMatching.enabled}
                onChange={handleToggleEnabled}
                className="iphone-toggle-input"
              />
              <span className="iphone-toggle-slider"></span>
            </label>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={!smartMatching.enabled}
          >
            {showAdvanced ? '▲ Hide' : '▼ Advanced'}
          </button>
        </div>
        
        <div className="setting-description">
          {smartMatching.enabled ? (
            <span className="enabled-text">
              Smart Matching is enabled! I need more devs to test this feature lol
            </span>
          ) : (
            <span className="disabled-text">
              Smart Matching is currently off. We're now on a completely garbage random matching
            </span>
          )}
        </div>

        {smartMatching.enabled && (
          <div className="smart-matching-benefits">
            <div className="benefits-grid">
              <div className="benefit-item">
                <span className="benefit-icon">⚖️</span>
                <span className="benefit-text">Balanced Teams</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🔄</span>
                <span className="benefit-text">Varied Partnerships</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">📈</span>
                <span className="benefit-text">Skill-Based Matching</span>
              </div>
              <div className="benefit-item">
                <span className="benefit-icon">🎲</span>
                <span className="benefit-text">Fair Opponent Rotation</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {smartMatching.enabled && showAdvanced && (
        <div className="advanced-settings">
          <h4 className="advanced-title">Advanced Settings</h4>
          
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
              <span className="setting-hint">How much to prioritize different partnerships (0.0-1.0)</span>
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

      <style jsx>{`
        .smart-matching-settings {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }

        .setting-group {
          margin-bottom: 16px;
        }

        .setting-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .setting-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
        }

        .setting-title {
          font-size: 16px;
          font-weight: 600;
        }

        .setting-description {
          font-size: 14px;
          margin-bottom: 12px;
        }

        .enabled-text {
          color: #28a745;
          font-weight: 500;
        }

        .disabled-text {
          color: #6c757d;
        }

        .smart-matching-benefits {
          margin-top: 12px;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .benefit-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          background: white;
          border-radius: 4px;
          font-size: 13px;
        }

        .benefit-icon {
          font-size: 14px;
        }

        .advanced-settings {
          border-top: 1px solid #dee2e6;
          padding-top: 16px;
          margin-top: 16px;
        }

        .advanced-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #495057;
        }

        .setting-row {
          margin-bottom: 16px;
        }

        .setting-hint {
          display: block;
          font-size: 12px;
          color: #6c757d;
          font-weight: normal;
          margin-top: 2px;
        }

        .range-input-group {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .range-input {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: #dee2e6;
          outline: none;
          cursor: pointer;
        }

        .range-input::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
        }

        .range-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
          border: none;
        }

        .range-value {
          font-weight: 600;
          color: #007bff;
          min-width: 40px;
          text-align: center;
        }

        .settings-explanation {
          margin-top: 16px;
          padding: 12px;
          background: #e9ecef;
          border-radius: 6px;
        }

        .settings-explanation h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #495057;
        }

        .settings-explanation ul {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
          color: #6c757d;
        }

        .settings-explanation li {
          margin-bottom: 4px;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid #dee2e6;
          color: #6c757d;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .btn-ghost:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #adb5bd;
        }

        .btn-ghost:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .benefits-grid {
            grid-template-columns: 1fr;
          }
          
          .range-input-group {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default SmartMatchingSettings;
