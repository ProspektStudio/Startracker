import React, { useState } from 'react';
import CurrentlyViewing from './CurrentlyViewing';
import useClientStore from '@/hooks/useClientStore';
import AiInfo from './AiInfo';
import SatelliteInfo from './SatelliteInfo';

const SidePanel: React.FC = () => {
  const { selectedSatellite } = useClientStore();
  const [activeTab, setActiveTab] = useState<'ai' | 'info'>('ai');

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
            </div>
          </section>

          <div className="separator" />

          <section className="section">
            <div className="tabs">
            <button 
                className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                A.I. Insights
              </button>
              <button 
                className={`tab ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Information
              </button>
            </div>
            <div className="tab-indicator" />
            <div className="tab-content">
              {activeTab === 'ai' && (
                <AiInfo selectedSatellite={selectedSatellite} />
              )}
              {activeTab === 'info' && (
                <SatelliteInfo selectedSatellite={selectedSatellite} />
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
          padding: 8px 16px;
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
      `}</style>
    </div>
  );
};

export default SidePanel;
