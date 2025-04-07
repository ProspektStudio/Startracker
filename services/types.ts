import * as THREE from 'three';
import { CelestrakResponse } from './data';

interface SatelliteData {
  name: string;
  noradId: number;
  orbit: {
    height: number;
    inclination: number;
    phase: number;
  },
  rawData: CelestrakResponse;
}

export type { SatelliteData };
