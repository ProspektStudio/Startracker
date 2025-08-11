import { create } from 'zustand';
import { SatelliteData } from '../services/types';

interface ClientState {
  selectedGroup: string;
  satellites: SatelliteData[];
  selectedSatellite: SatelliteData | null;
  setSelectedGroup: (group: string) => void;
  setSatellites: (satellites: SatelliteData[]) => void;
  setSelectedSatellite: (satellite: SatelliteData | null) => void;
}

const useClientStore = create<ClientState>()((set, get) => ({
  selectedGroup: 'stations', // Default to stations group
  satellites: [],
  selectedSatellite: null,
  setSelectedGroup: (group) => {
    if (group !== get().selectedGroup) {
      set({ 
        selectedSatellite: null,
        satellites: []
      });
      set({ selectedGroup: group });
    }
  },
  setSatellites: (satellites) => set({ satellites: satellites }),
  setSelectedSatellite: (satellite) => set({ selectedSatellite: satellite }),
}));

export default useClientStore;
