import { SatelliteData } from '@/services/types';

interface SatellitePopupProps {
  data: SatelliteData;
  x: number;
  y: number;
}

const SatellitePopup: React.FC<SatellitePopupProps> = ({ data, x, y }) => {
  const EARTH_RADIUS = 6371; // Earth radius in km

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        borderRadius: '8px',
        fontSize: '14px',
        zIndex: 1000,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '305px',
        transform: 'translate(-50%, 20px)',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'relative', width: '305px', height: '174px' }}>
        <img 
          src="/default.jpg" 
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