import React from 'react';
import CurrentlyViewing from './CurrentlyViewing';
import useClientStore from '@/services/clientStore';
import AiInfo from './AiInfo';

const SidePanel: React.FC = () => {
  const { selectedSatellite } = useClientStore();

  return (
    <div className="side-panel">
      <CurrentlyViewing />
      {selectedSatellite && (
        <>
          <h2>{selectedSatellite.name}</h2>
          <AiInfo selectedSatellite={selectedSatellite} />
        </>
      )}
      <style jsx>{`
        .side-panel {
          width: 400px;
          height: 100%;
          background: rgba(25, 25, 25, 0.85);
          color: white;
          padding: 32px;
          box-shadow: -2px 0 5px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          overflow-y: auto;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 5px 10px;
        }

        .close-button:hover {
          color: #ccc;
        }

        h2 {
          margin-top: 30px;
          margin-bottom: 20px;
          font-size: 1.5em;
        }
      `}</style>
    </div>
  );
};

export default SidePanel;
