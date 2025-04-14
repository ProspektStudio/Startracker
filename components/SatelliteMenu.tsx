import { useState } from 'react';
import Image from 'next/image';

const SatelliteMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('Satellite Groups');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#D2D2D2',
          fontSize: '16px',
          fontFamily: 'Shentox, sans-serif',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          textDecoration: 'underline',
        }}
      >
        FIND A SATELLITE
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '475px',
            height: '340px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '0.8px solid #434343',
            borderRadius: '0',
            overflow: 'hidden',
          }}
        >
          {/* Top border stroke */}
          <div style={{
            height: '4px',
            backgroundColor: '#434343',
            width: '100%',
          }} />

          {/* Menu section */}
          <div style={{
            padding: '16px 16px 14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <Image
                src="/triangle-svgrepo-com.svg"
                alt="Menu Icon"
                width={16}
                height={16}
                style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(4%) saturate(1000%) hue-rotate(180deg) brightness(90%) contrast(90%)' }}
              />
              <span style={{
                color: '#D2D2D2',
                fontSize: '16px',
                fontFamily: 'Shentox, sans-serif',
              }}>
                Satellite Groups
              </span>
            </div>
            <Image
              src="/dots-6-vertical-svgrepo-com.svg"
              alt="Drag Handle"
              width={16}
              height={16}
              style={{ 
                cursor: 'move',
                filter: 'brightness(0) saturate(100%) invert(85%) sepia(4%) saturate(1000%) hue-rotate(180deg) brightness(90%) contrast(90%)',
              }}
            />
            {/* Selection indicator */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '16px',
              width: '120%',
              height: '1px',
              backgroundColor: 'white',
              opacity: '0.3',
            }} />
          </div>

          {/* Separator line */}
          <div style={{
            height: '1px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            width: '100%',
          }} />

          {/* Content section */}
          <div style={{
            padding: '8px 0 8px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            height: 'calc(100% - 75px)',
            overflowY: 'auto',
          }}>
            {/* Example menu items - replace with actual Celestrak data */}
            <div
              onMouseEnter={() => setHoveredItem('active')}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                padding: '11px',
                color: '#FFFFFF',
                fontFamily: 'Shentox, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: hoveredItem === 'active' ? 'rgba(169, 175, 189, 0.2)' : 'transparent',
              }}
            >
              <span>Active Satellites</span>
              <Image
                src="/triangle-svgrepo-com.svg"
                alt="Arrow"
                width={16}
                height={16}
                style={{ filter: 'brightness(0) saturate(100%) invert(85%) sepia(4%) saturate(1000%) hue-rotate(180deg) brightness(90%) contrast(90%)' }}
              />
            </div>
            {/* Add more menu items here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default SatelliteMenu; 