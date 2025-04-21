interface SatelliteData {
  name: string;
  noradId: number;
  group: string;
  orbit: {
    height: number;
    inclination: number;
    phase: number;
  },
  position?: {
    latitude: number;
    longitude: number;
  },
  rawData: CelestrakResponse;
}

export type { SatelliteData };

export interface CelestrakResponse {
  NORAD_CAT_ID: number;
  OBJECT_ID: string;
  OBJECT_NAME: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  fetchTime: Date;
}
