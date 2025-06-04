import useClientStore from '@/hooks/useClientStore';
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
    <div className="flex flex-col gap-2">
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
    </div>
  );
};

export default CurrentlyViewing;
