import Dexie, { Table } from 'dexie';
import type { CelestrakResponse, SatelliteData } from './types';

// Constants for realistic orbital heights (in Earth radii)
const EARTH_RADIUS = 6371;

const STALE_TIME = 24 * 60 * 60 * 1000 // 24 hours

interface SatelliteGroupMap {
  id: string;
  group: string;
  NORAD_CAT_ID: number;
}

class SatelliteDB extends Dexie {
  satellites!: Table<CelestrakResponse, number>;
  satellitesByGroup!: Table<SatelliteGroupMap, string>;

  constructor() {
    super('SatelliteDB');
    this.version(3).stores({
      satellites: 'NORAD_CAT_ID',
      satellitesByGroup: 'id, group'
    }).upgrade(tx => {
      console.log('Clearing all data when upgrading to version 3 (fetchTime type change)');
      return Promise.all([
        tx.table('satellites').clear(),
        tx.table('satellitesByGroup').clear()
      ]);
    });

    // Log current version
    this.on('ready', () => {
      console.log('Database ready, current version:', this.verno);
    });
  }
}

const db = new SatelliteDB();

const storeSatelliteData = async (data: CelestrakResponse[], group: string) => {
  try {
    await db.transaction('rw', db.satellites, db.satellitesByGroup, async () => {
      // Delete existing satellites in this group
      const existingGroupEntries = await db.satellitesByGroup
        .where('group')
        .equals(group)
        .toArray();
      
      const existingNoradIds = existingGroupEntries.map(entry => entry.NORAD_CAT_ID);
      await db.satellites.where('NORAD_CAT_ID').anyOf(existingNoradIds).delete();
      await db.satellitesByGroup.where('group').equals(group).delete();

      // Store new data
      await db.satellites.bulkPut(data);

      const groupEntries: SatelliteGroupMap[] = data.map((sat, index) => ({
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

const getSatellitesByGroup = async (group: string): Promise<CelestrakResponse[]> => {
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

const getSatelliteDataFromDB = async (group: string): Promise<CelestrakResponse[]> => {
  try {
    return await getSatellitesByGroup(group);
  } catch (error) {
    console.error('Error retrieving satellite data using Dexie:', error);
    return [];
  }
};

const fetchFromCelestrak = async (group: string): Promise<CelestrakResponse[] | undefined> => {
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
    const fetchTime = Date.now();
    data.forEach(sat => sat.fetchTime = fetchTime);
    console.log('Received satellite data at', new Date(fetchTime).toISOString(), 'for group', group, data);

    await storeSatelliteData(data, group);

    return data;
  } catch (error) {
    console.error('Error fetching satellite positions:', error);
    return undefined;
  }
};

const getSatelliteData = async (group: string = 'stations'): Promise<SatelliteData[]> => {

  const cachedData = await getSatelliteDataFromDB(group);

  const oldestFetchTime = cachedData.length > 0
    ? cachedData.reduce((min, sat) => Math.min(min, sat.fetchTime), Infinity)
    : null;
  console.log('oldestFetchTime:', oldestFetchTime ?
    `${new Date(oldestFetchTime).toLocaleString()} (${((Date.now() - oldestFetchTime) / (1000 * 60 * 60)).toFixed(1)} hours ago)`
    : 'null');

  let data = cachedData;
  if (oldestFetchTime && oldestFetchTime > Date.now() - STALE_TIME) {
    console.log('Using cached data (less than 24 hours old)');
  } else {
    console.log('Cache is stale or empty, fetching new data from Celestrak');
    const fetchedData = await fetchFromCelestrak(group);
    if (fetchedData) {
      data = fetchedData;
    } else {
      console.log("Couldn't fetch data, falling back to cache");
    }
  }
  return data.map(calculateOrbitAndPosition(group)).sort((a, b) => a.name.localeCompare(b.name));
};

const calculateOrbitAndPosition = (group: string) => (satellite: CelestrakResponse) => {

  // Calculate orbital parameters
  const semiMajorAxis = Math.pow(398600.4418 / (Math.pow(satellite.MEAN_MOTION * 2 * Math.PI / 86400, 2)), 1/3) / EARTH_RADIUS;
  const inclination = satellite.INCLINATION * (Math.PI / 180);
  const raan = satellite.RA_OF_ASC_NODE * (Math.PI / 180);
  const argPerigee = satellite.ARG_OF_PERICENTER * (Math.PI / 180);
  const meanAnomaly = satellite.MEAN_ANOMALY * (Math.PI / 180);
  
  // set orbit and position
  return {
    name: satellite.OBJECT_NAME,
    noradId: satellite.NORAD_CAT_ID,
    group: group,
    rawData: satellite,
    orbit: {
      height: semiMajorAxis * (1 - satellite.ECCENTRICITY) - 1,
      inclination: inclination,
      phase: meanAnomaly,
      argPerigee: argPerigee,
      raan: raan
    },
    position: {
      latitude: Math.asin(Math.sin(meanAnomaly) * Math.sin(inclination)) * (180 / Math.PI),
      longitude: Math.atan2(
        Math.sin(meanAnomaly) * Math.cos(inclination),
        Math.cos(meanAnomaly)
      ) * (180 / Math.PI)
    }
  }
}

export default getSatelliteData;
