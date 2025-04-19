import { useState, useEffect } from 'react';
import Image from 'next/image';
import { SatelliteData } from '@/services/types';

interface SatelliteMenuProps {
  onGroupSelect: (group: string) => void;
  satellites: SatelliteData[];
  onSatelliteClick: (satellite: SatelliteData) => void;
}

const SatelliteMenu: React.FC<SatelliteMenuProps> = ({ 
  onGroupSelect, 
  satellites,
  onSatelliteClick 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('stations');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<string | null>(null);

  useEffect(() => {
    onGroupSelect('stations');
  }, []);

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
            left: '0',
            transform: 'translateX(0)',
            width: '605px',
            height: '274px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '4px',
            marginTop: '8px',
            zIndex: 1000,
            display: 'flex',
          }}
        >
          {/* Groups Column */}
          <div style={{ width: '50%', padding: '16px' }}>
            {/* Top border stroke */}
            <div style={{
              height: '4px',
              backgroundColor: '#434343',
              width: '100%',
              marginBottom: '16px',
            }} />

            {/* Menu section */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
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
              marginBottom: '16px',
            }} />

            {/* Groups list */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
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

          {/* Vertical separator */}
          {selectedGroup !== 'Satellite Groups' && (
            <div style={{
              width: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              margin: '16px 0',
            }} />
          )}

          {/* Satellites Column */}
          {selectedGroup !== 'Satellite Groups' && (
            <div style={{ 
              width: '50%', 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                color: '#D2D2D2',
                fontSize: '16px',
                fontFamily: 'Shentox, sans-serif',
                marginBottom: '16px',
              }}>
                Satellites in {groups.find(g => g.value === selectedGroup)?.name}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                overflowY: 'auto',
                flex: 1,
              }}>
                {satellites.map((satellite) => (
                  <div
                    key={satellite.noradId}
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: 'Shentox, sans-serif',
                      fontSize: '14px',
                      color: '#ffffff',
                      backgroundColor: hoveredItem === satellite.name || selectedSatellite === satellite.name
                        ? 'rgba(255, 255, 255, 0.1)' 
                        : 'transparent',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={() => setHoveredItem(satellite.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                    onClick={() => {
                      onSatelliteClick(satellite);
                      setSelectedSatellite(satellite.name);
                    }}
                  >
                    {satellite.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SatelliteMenu; 