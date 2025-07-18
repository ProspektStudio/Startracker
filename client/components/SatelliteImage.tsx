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
    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/20 relative">
      <img 
        src={getSatelliteImage()} 
        alt={`${selectedSatellite.name} satellite`}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-0 right-0 px-6 text-white text-base font-semibold text-center font-inter [text-shadow:_0_0_10px_rgba(0,0,0,1),_0_0_20px_rgba(0,0,0,1),_0_0_30px_rgba(0,0,0,1),_0_0_40px_rgba(0,0,0,1)]">
        {selectedSatellite.name}
      </div>
    </div>
  );
};

export default SatelliteImage;
