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

  const selectStyle = {
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '16px',
    fontFamily: 'Shentox, sans-serif',
    cursor: 'pointer',
    width: '200px'
  };

  const labelStyle = {
    color: '#969696',
    paddingRight: '16px',
    whiteSpace: 'nowrap'
  };

  const cellStyle = {
    padding: '8px 8px'
  };

  return (
    <div>
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          fontSize: '16px',
          fontFamily: 'Shentox, sans-serif',
          color: '#FFFFFF',
        }}
      >
        <table>
          <tbody>
            <tr>
              <td style={{ ...labelStyle, ...cellStyle }}>Current Group:</td>
              <td style={cellStyle}>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={selectStyle}
                >
                  {groups.map((group) => (
                    <option key={group.value} value={group.value}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ ...labelStyle, ...cellStyle }}>Selected Satellite:</td>
              <td style={cellStyle}>
                <select
                  value={selectedSatellite?.noradId}
                  onChange={(e) => onSatelliteSelect(Number(e.target.value))}
                  style={selectStyle}
                >
                  <option value=""></option>
                  {satellites.map((satellite) => (
                    <option key={satellite.noradId} value={satellite.noradId}>
                      {satellite.name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CurrentlyViewing;
