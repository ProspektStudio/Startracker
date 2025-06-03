import useClientStore from '@/services/clientStore';
import CustomDropdown from './CustomDropdown';

const CurrentlyViewing: React.FC = () => {
  const { selectedGroup, satellites, selectedSatellite, setSelectedGroup, setSelectedSatellite } = useClientStore();

  const groups = [
    { value: 'stations', label: 'Space Stations' },
    { value: 'globalstar', label: 'Globalstar' },
    { value: 'intelsat', label: 'Intelsat' }
  ];

  // Only show if a group is selected
  if (!selectedGroup) return null;

  const onSatelliteSelect = (noradId: number) => {
    setSelectedSatellite(satellites.find(satellite => satellite.noradId === noradId) || null);
  };

  const satelliteOptions = satellites.map(sat => ({
    value: sat.noradId.toString(),
    label: sat.name
  }));

  return (
    <div className="currently-viewing">
      <h3 className="title">Find Satellite</h3>
      
      <CustomDropdown
        options={groups}
        value={selectedGroup}
        onChange={setSelectedGroup}
        placeholder="Groups"
      />

      <CustomDropdown
        options={satelliteOptions}
        value={selectedSatellite?.noradId.toString() || ''}
        onChange={(value) => onSatelliteSelect(Number(value))}
        placeholder="Select a Satellite"
      />

      <style jsx>{`
        .currently-viewing {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px 8px;
        }

        .title {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: rgba(183, 183, 183, 0.7);
          margin: 0 0 8px 0;
        }
      `}</style>
    </div>
  );
};

export default CurrentlyViewing;
