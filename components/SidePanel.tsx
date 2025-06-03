import React, { useState } from 'react';
import CurrentlyViewing from './CurrentlyViewing';
import useClientStore from '@/services/clientStore';
import AiInfo from './AiInfo';

const SidePanel: React.FC = () => {
  const { selectedSatellite } = useClientStore();
  const [activeTab, setActiveTab] = useState<'info' | 'ai'>('info');

  const getSatelliteImage = () => {
    if (!selectedSatellite) return '/default.jpg';
    const group = selectedSatellite.group || '';
    switch (group.toLowerCase()) {
      case 'globalstar':
        return '/Globalstar_1.webp';
      case 'intelsat':
        return '/Intelsat.jpg';
      case 'stations':
        return '/SpaceStation.avif';
      default:
        return '/default.jpg';
    }
  };

  return (
    <div className="side-panel">
      <section className="section no-padding">
        <CurrentlyViewing />
      </section>

      {selectedSatellite && (
        <>
          <div className="separator" />
          
          <section className="section">
            <div className="satellite-header">
              <h2>{selectedSatellite.name}</h2>
              <span className="group-label">{selectedSatellite.group}</span>
            </div>
          </section>

          <div className="separator" />

          <section className="section">
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Information
              </button>
              <button 
                className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                A.I. Insights
              </button>
            </div>
            <div className="tab-indicator" />
            <div className="tab-content">
              {activeTab === 'info' && (
                <div className="satellite-info">
                  <img 
                    src={getSatelliteImage()} 
                    alt={selectedSatellite.name}
                    className="satellite-image"
                  />
                  <div className="info-stats">
                    <div className="info-row">
                      <span className="label">Height:</span>
                      <span className="value">{Math.round(selectedSatellite.orbit.height * 6371)} km</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Inclination:</span>
                      <span className="value">{(selectedSatellite.orbit.inclination * (180 / Math.PI)).toFixed(6)}°</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Phase:</span>
                      <span className="value">{selectedSatellite.orbit.phase.toFixed(6)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Norad ID:</span>
                      <span className="value">{selectedSatellite.noradId}</span>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'ai' && (
                <AiInfo selectedSatellite={selectedSatellite} />
              )}
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .side-panel {
          width: 400px;
          height: 100%;
          background: rgba(25, 25, 25, 0.85);
          color: white;
          z-index: 1000;
          overflow-y: auto;
        }

        .section {
          padding: 24px 32px;
        }

        .section.no-padding {
          padding: 0;
        }

        .section:has(.satellite-header) {
          padding: 16px;
        }

        .section:has(.tab-content) {
          padding: 24px 16px;
        }

        .separator {
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0;
        }

        .satellite-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }

        .satellite-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          margin-bottom: 20px;
        }

        h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 400;
          color: #D8D8D8;
          font-family: 'Inter', sans-serif;
        }

        .group-label {
          color: rgba(183, 183, 183, 0.8);
          font-size: 13px;
          margin-top: 4px;
          text-transform: capitalize;
          font-family: 'Inter', sans-serif;
        }

        .tabs {
          display: flex;
          gap: 32px;
          margin-bottom: 16px;
          position: relative;
        }

        .tab {
          padding: 8px 0;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.03em;
          position: relative;
        }

        .tab:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .tab.active {
          color: white;
        }

        .tab-indicator {
          position: absolute;
          bottom: -16px;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
        }

        .tab.active::after {
          content: '';
          position: absolute;
          bottom: -16px;
          left: 0;
          right: 0;
          height: 2px;
          background: white;
          transition: all 0.2s ease;
        }

        .tab-content {
          margin-top: 32px;
          border-radius: 8px;
          padding: 16px 0;
        }

        .satellite-info {
          display: flex;
          flex-direction: column;
        }

        .info-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 0 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .label {
          color: #969696;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: -0.03em;
        }

        .value {
          color: white;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          letter-spacing: -0.03em;
        }
      `}</style>
    </div>
  );
};

export default SidePanel;
