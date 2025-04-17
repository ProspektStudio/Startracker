import { useState } from 'react';
import Image from 'next/image';
import { SatelliteData } from '@/services/types';

interface CurrentlyViewingProps {
  selectedGroup: string;
  satellites: SatelliteData[];
  onSatelliteClick: (satellite: SatelliteData) => void;
}

const CurrentlyViewing: React.FC<CurrentlyViewingProps> = ({ selectedGroup, satellites, onSatelliteClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Only show the dropdown if a group is selected
  if (!selectedGroup) return null;

  const satelliteItems = satellites.map(satellite => ({
    name: satellite.name,
    value: satellite.noradId.toString(),
    onMouseEnter: () => setHoveredItem(satellite.noradId.toString()),
    onMouseLeave: () => setHoveredItem(null),
    onClick: () => {
      onSatelliteClick(satellite);
      setIsOpen(false);
    },
    style: {
      padding: '11px',
      cursor: 'pointer',
      fontFamily: 'Shentox, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      backgroundColor: hoveredItem === satellite.noradId.toString()
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'transparent',
      transition: 'background-color 0.2s ease'
    }
  }));

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          padding: '12px 8px 12px 16px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '20px',
          fontFamily: 'Shentox, sans-serif',
          color: '#FFFFFF',
        }}
      >
        <Image
          src="/triangle-svgrepo-com.svg"
          alt="Menu Icon"
          width={16}
          height={16}
          style={{ 
            marginRight: '16px',
            filter: 'brightness(0) saturate(100%) invert(85%) sepia(4%) saturate(1000%) hue-rotate(180deg) brightness(90%) contrast(90%)'
          }}
        />
        <span style={{ marginRight: '88px' }}>Currently Viewing</span>
        <Image
          src="/chevron-up-svgrepo-com.svg"
          alt="Dropdown Icon"
          width={16}
          height={16}
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            filter: 'brightness(0) saturate(100%) invert(85%) sepia(4%) saturate(1000%) hue-rotate(180deg) brightness(90%) contrast(90%)'
          }}
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '8px 0',
          }}
        >
          {satelliteItems.map((item) => (
            <div
              key={item.value}
              onClick={item.onClick}
              onMouseEnter={item.onMouseEnter}
              onMouseLeave={item.onMouseLeave}
              style={{
                ...item.style,
                paddingLeft: '24px',
                paddingRight: '0',
              }}
            >
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrentlyViewing; 