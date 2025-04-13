import Dexie, { Table } from 'dexie';

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

class SatelliteDB extends Dexie {
  satellites!: Table<CelestrakResponse, number>;

  constructor() {
    super('SatelliteDB');
    this.version(1).stores({
      satellites: 'NORAD_CAT_ID'
    });
  }
}

const db = new SatelliteDB();

// Store data using Dexie
const storeSatelliteData = async (data: CelestrakResponse[]) => {
  try {
    await db.transaction('rw', db.satellites, async () => {
      await db.satellites.clear();
      await db.satellites.bulkPut(data);
    });
    console.log('Satellite data stored using Dexie');
  } catch (error) {
    console.error('Error storing satellite data using Dexie:', error);
  }
};

export const getSatelliteDataFromDB = async (): Promise<CelestrakResponse[]> => {
  try {
    return await db.satellites.toArray();
  } catch (error) {
    console.error('Error retrieving satellite data using Dexie:', error);
    return [];
  }
};

const fetchSatellitePositions = async (): Promise<CelestrakResponse[]> => {
  try {
    const group = 'stations';

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

    await storeSatelliteData(data);

    return data;
  } catch (error) {
    console.error('Error fetching satellite positions:', error);
    return [];
  }
};

const getSatelliteData = async (): Promise<CelestrakResponse[]> => {
  // First try to get data from Dexie/IndexedDB
  const cachedData = await getSatelliteDataFromDB();

  const oldestFetchTime = cachedData.length > 0
    ? cachedData.reduce((min, sat) => Math.min(min, sat.fetchTime.getTime()), Infinity)
    : null;
  const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;

  if (oldestFetchTime && oldestFetchTime > oneHourAgo) {
    console.log('Retrieved fresh satellite data from Dexie/IndexedDB');
    return cachedData;
  } else if (oldestFetchTime) {
    console.log('Cached data is too old, fetching new data.');
  } else {
    console.log('No cached data found, fetching new data.');
  }

  // If no fresh cached data, fetch from API
  return fetchSatellitePositions();
};

export type { CelestrakResponse };

export default getSatelliteData;
