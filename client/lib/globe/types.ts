import type { SatelliteData } from '@/services/types';

export interface SatellitePointData {
  data: SatelliteData;
  phase: number;
}

export interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

export interface PopupState {
  visible: boolean;
  data: SatelliteData | null;
  x: number;
  y: number;
}
