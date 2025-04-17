import { useState } from 'react';
import Image from 'next/image';

interface SatelliteMenuProps {
  onGroupSelect: (group: string) => void;
}

const SatelliteMenu: React.FC<SatelliteMenuProps> = ({ onGroupSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('Satellite Groups');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const groups = [
    { name: 'Space Stations', value: 'stations' },
    { name: 'Globalstar', value: 'globalstar' },
    { name: 'Intelsat', value: 'intelsat' }
  ].map(group => ({
    ...group,
    onMouseEnter: () => setHoveredItem(group.value),
    onMouseLeave: () => setHoveredItem(null),
    onClick: () => {
      onGroupSelect(group.value);
      setSelectedGroup(group.value);
    },
    style: {
      padding: '8px 16px',
      cursor: 'pointer',
      fontFamily: 'Shentox, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: hoveredItem === group.value || selectedGroup === group.value 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'transparent',
      transition: 'background-color 0.2s ease'
    }
  }));

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(115, 115, 115, 0.4)',
          border: 'none',
          color: '#FFFFFF',
          fontSize: '16px',
          fontFamily: 'Shentox, sans-serif',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '12px 16px',
          position: 'relative',
        }}
      >
        <span>FIND A SATELLITE</span>
        <div style={{
          width: '100%',
          height: '2px',
          backgroundColor: 'white',
          opacity: '1',
        }} />
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
            {groups.map((group) => (
              <div
                key={group.value}
                onClick={group.onClick}
                onMouseEnter={group.onMouseEnter}
                onMouseLeave={group.onMouseLeave}
                style={group.style}
              >
                {group.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SatelliteMenu; 