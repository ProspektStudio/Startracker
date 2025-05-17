import { create } from 'zustand';
import { SatelliteData } from './types';

interface ClientState {
  selectedGroup: string;
  selectedSatellite: SatelliteData | null;
  setSelectedGroup: (group: string) => void;
  setSelectedSatellite: (satellite: SatelliteData | null) => void;
}

const useClientStore = create<ClientState>()((set) => ({
  selectedGroup: 'stations', // Default to stations group
  selectedSatellite: null,
  setSelectedGroup: (group: string) => set({ selectedGroup: group }),
  setSelectedSatellite: (satellite: SatelliteData | null) => set({ selectedSatellite: satellite }),
}));

export default useClientStore;
