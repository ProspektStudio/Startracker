import React from 'react';
import { SatelliteData } from '@/services/types';

interface SatelliteImageProps {
  selectedSatellite: SatelliteData;
}

const SatelliteImage: React.FC<SatelliteImageProps> = ({ selectedSatellite }) => {
  const getSatelliteImage = () => {
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
    <div className="satellite-image-container">
      <img 
        src={getSatelliteImage()} 
        alt={`${selectedSatellite.name} satellite`}
        className="satellite-image"
      />
      <div className="satellite-name">
        {selectedSatellite.name}
      </div>
      
      <style jsx>{`
        .satellite-image-container {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.2);
          position: relative;
        }

        .satellite-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .satellite-name {
          position: absolute;
          bottom: 16px;
          left: 0;
          right: 0;
          padding: 0 24px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          text-align: center;
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default SatelliteImage; 