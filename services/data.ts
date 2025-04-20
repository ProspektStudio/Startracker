import Dexie, { Table } from 'dexie';
import { CelestrakResponse } from './types';

interface CelestrakResponse {
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

interface SatelliteGroupPair {
  id: string;
  group: string;
  NORAD_CAT_ID: number;
}

class SatelliteDB extends Dexie {
  satellites!: Table<CelestrakResponse, number>;
  satellitesByGroup!: Table<SatelliteGroupPair, string>;

  constructor() {
    super('SatelliteDB');
    this.version(2).stores({
      satellites: 'NORAD_CAT_ID',
      satellitesByGroup: 'id, group'
    });
  }
}

const db = new SatelliteDB();

const storeSatelliteData = async (data: CelestrakResponse[], group: string) => {
  try {
    await db.transaction('rw', db.satellites, db.satellitesByGroup, async () => {
      await db.satellites.bulkPut(data);

      const groupEntries: SatelliteGroupPair[] = data.map((sat, index) => ({
        id: `${group}-${sat.NORAD_CAT_ID}`,
        group: group,
        NORAD_CAT_ID: sat.NORAD_CAT_ID
      }));
      await db.satellitesByGroup.bulkPut(groupEntries);
    });
    console.log('Satellite data and group associations stored using Dexie');
  } catch (error) {
    console.error('Error storing satellite data using Dexie:', error);
  }
};

export const getSatellitesByGroup = async (group: string): Promise<CelestrakResponse[]> => {
  try {
    const groupEntries = await db.satellitesByGroup
      .where('group')
      .equals(group)
      .toArray();
    
    const noradIds = groupEntries.map(entry => entry.NORAD_CAT_ID);
    const satellites = await db.satellites
      .where('NORAD_CAT_ID')
      .anyOf(noradIds)
      .toArray();
    
    return satellites;
  } catch (error) {
    console.error('Error retrieving satellites by group:', error);
    return [];
  }
};

export const getSatelliteDataFromDB = async (group: string): Promise<CelestrakResponse[]> => {
  try {
    return await getSatellitesByGroup(group);
  } catch (error) {
    console.error('Error retrieving satellite data using Dexie:', error);
    return [];
  }
};

const fetchSatellitePositions = async (group: string): Promise<CelestrakResponse[]> => {
  try {
    const response = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as CelestrakResponse[];
    const fetchTime = new Date();
    data.forEach(sat => sat.fetchTime = fetchTime);
    console.log('Received satellite data:', data);

    await storeSatelliteData(data, group);

    return data;
  } catch (error) {
    console.error('Error fetching satellite positions:', error);
    return [];
  }
};

export const getSatelliteData = async (group: string): Promise<CelestrakResponse[]> => {
  try {
    const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`);
    const data = await response.json();
    
    // Add group information to each satellite
    return data.map((satellite: CelestrakResponse) => ({
      ...satellite,
      group: group,
      fetchTime: new Date()
    }));
  } catch (error) {
    console.error('Error fetching satellite data:', error);
    return [];
  }
};

export type { CelestrakResponse };

export default getSatelliteData;
