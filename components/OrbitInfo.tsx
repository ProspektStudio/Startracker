import React from 'react';
import { SatelliteData } from '@/services/types';

interface OrbitInfoProps {
  selectedSatellite: SatelliteData;
}

const getSatelliteImage = (selectedSatellite: SatelliteData) => {
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

const OrbitInfo: React.FC<OrbitInfoProps> = ({ selectedSatellite }) => {
  return (
    <div className="satellite-info">
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

      <style jsx>{`
        .satellite-info {
          display: flex;
          flex-direction: column;
        }

        .satellite-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          margin-bottom: 20px;
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

export default OrbitInfo;
