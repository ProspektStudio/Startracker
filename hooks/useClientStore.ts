import { create } from 'zustand';
import { SatelliteData } from '../services/types';

interface ClientState {
  satellites: SatelliteData[];
  selectedGroup: string;
  selectedSatellite: SatelliteData | null;
  setSatellites: (satellites: SatelliteData[]) => void;
  setSelectedGroup: (group: string) => void;
  setSelectedSatellite: (satellite: SatelliteData | null) => void;
}

const useClientStore = create<ClientState>()((set) => ({
  satellites: [],
  selectedGroup: 'stations', // Default to stations group
  selectedSatellite: null,
  setSatellites: (satellites) => set({ satellites: satellites }),
  setSelectedGroup: (group) => set({ selectedGroup: group }),
  setSelectedSatellite: (satellite) => set({ selectedSatellite: satellite }),
}));

export default useClientStore;
