import { SatelliteData } from '@/services/types';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

interface SatellitePopupProps {
  data: SatelliteData;
  x: number;
  y: number;
  isVisible: boolean;
  setGettingInfo: Dispatch<SetStateAction<boolean>>;
}

const SatellitePopup: React.FC<SatellitePopupProps> = ({ data, x, y, isVisible }) => {
  const [opacity, setOpacity] = useState(0);
  const EARTH_RADIUS = 6371; // Earth radius in km

  useEffect(() => {
    if (isVisible) {
      // Fade in
      setOpacity(1);
    } else {
      // Fade out
      setOpacity(0);
    }
  }, [isVisible]);

  // Get the appropriate image based on the satellite's group
  const getSatelliteImage = () => {
    const group = data.group || '';
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
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: '305px',
        height: '174px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: opacity > 0 ? 'auto' : 'none',
      }}
    >
      <div style={{ position: 'relative', width: '305px', height: '174px' }}>
        <img 
          src={getSatelliteImage()} 
          alt={data.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '0',
          right: '0',
          padding: '0 24px',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          width: '100%'
        }}>
          {data.name}
        </div>
      </div>

      <div style={{ 
        padding: '12px 24px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div>
          <span style={{ 
            color: '#969696',
            fontFamily: 'Shentox',
            fontWeight: 500,
            textTransform: 'uppercase',
            paddingRight: '8px'
          }}>Height:</span>
          <span style={{ color: 'white' }}>{Math.round(data.orbit.height * EARTH_RADIUS)} km</span>
        </div>
        <div>
          <span style={{ 
            color: '#969696',
            fontFamily: 'Shentox',
            fontWeight: 500,
            textTransform: 'uppercase',
            paddingRight: '8px'
          }}>Inclination:</span>
          <span style={{ color: 'white' }}>{(data.orbit.inclination * (180 / Math.PI)).toFixed(6)}°</span>
        </div>
        <div>
          <span style={{ 
            color: '#969696',
            fontFamily: 'Shentox',
            fontWeight: 500,
            textTransform: 'uppercase',
            paddingRight: '8px'
          }}>Phase:</span>
          <span style={{ color: 'white' }}>{data.orbit.phase.toFixed(6)}</span>
        </div>
        <div>
          <span style={{ 
            color: '#969696',
            fontFamily: 'Shentox',
            fontWeight: 500,
            textTransform: 'uppercase',
            paddingRight: '8px'
          }}>Norad ID:</span>
          <span style={{ color: 'white' }}>{data.noradId}</span>
        </div>
      </div>
    </div>
  );
};

export default SatellitePopup; 