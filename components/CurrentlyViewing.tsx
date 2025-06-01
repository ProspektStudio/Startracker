import useClientStore from '@/services/clientStore';

const CurrentlyViewing: React.FC = () => {
  const { selectedGroup, satellites, selectedSatellite, setSelectedGroup, setSelectedSatellite } = useClientStore();

  const groups = [
    { name: 'Space Stations', value: 'stations' },
    { name: 'Globalstar', value: 'globalstar' },
    { name: 'Intelsat', value: 'intelsat' }
  ];

  // Only show if a group is selected
  if (!selectedGroup) return null;

  const onSatelliteSelect = (noradId: number) => {
    setSelectedSatellite(satellites.find(satellite => satellite.noradId === noradId) || null);
  };

  return (
    <div>
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
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
            Current Group:
          </span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '16px',
              fontFamily: 'Shentox, sans-serif',
              cursor: 'pointer'
            }}
          >
            {groups.map((group) => (
              <option key={group.value} value={group.value}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ 
            color: '#969696',
            marginRight: '8px'
          }}>
            Selected Satellite:
          </span>
          <select
            value={selectedSatellite?.noradId}
            onChange={(e) => onSatelliteSelect(Number(e.target.value))}
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '16px',
              fontFamily: 'Shentox, sans-serif',
              cursor: 'pointer'
            }}
          >
            <option value=""></option>
            {satellites.map((satellite) => (
              <option key={satellite.noradId} value={satellite.noradId}>
                {satellite.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CurrentlyViewing;
