import React from 'react';
import { SatelliteData } from '@/services/types';

interface SidePanelProps {
  satellites: SatelliteData[];
}

const SidePanel: React.FC<SidePanelProps> = ({ satellites }) => {
  if (!satellites) return null;

  return (
    <div className="side-panel">
      <h2>Satellites</h2>
      <div className="satellite-info">
        <pre>{JSON.stringify(satellites, null, 2)}</pre>
      </div>

      <style jsx>{`
        .side-panel {
          position: fixed;
          right: 0;
          top: 0;
          width: 400px;
          height: 100%;
          background: rgba(25, 25, 25, 0.85);
          color: white;
          padding: 20px;
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

        .satellite-info {
          margin-top: 20px;
        }

        .satellite-info p {
          margin: 10px 0;
          font-size: 14px;
        }

        strong {
          color: #88ccff;
        }
      `}</style>
    </div>
  );
};

export default SidePanel;
