import useClientStore from '@/services/clientStore';
import { SatelliteData } from '@/services/types';

const CurrentlyViewing: React.FC = () => {

  const { selectedGroup, selectedSatellite } = useClientStore();

  // Get the group name from the group value
  const getGroupName = (value: string) => {
    const groups = [
      { name: 'Space Stations', value: 'stations' },
      { name: 'Globalstar', value: 'globalstar' },
      { name: 'Intelsat', value: 'intelsat' }
    ];
    return groups.find(g => g.value === value)?.name || value;
  };

  // Only show if a group is selected
  if (!selectedGroup) return null;

  return (
    <div>
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          fontSize: '16px',
          fontFamily: 'Shentox, sans-serif',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            color: '#969696',
            marginRight: '8px'
          }}>
            Currently Viewing:
          </span>
          <span>
            {getGroupName(selectedGroup)}
          </span>
        </div>
        {selectedSatellite && (
          <div style={{ 
            fontSize: '14px',
            color: '#969696'
          }}>
            Selected: <span style={{ color: '#FFFFFF' }}>{selectedSatellite.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentlyViewing;
