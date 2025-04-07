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

// Initialize IndexedDB
const initDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('SatelliteDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('satellites')) {
        db.createObjectStore('satellites', { keyPath: 'NORAD_CAT_ID' });
      }
    };
  });
};

// Store data in IndexedDB
const storeSatelliteData = async (data: CelestrakResponse[]) => {
  try {
    const db = await initDB();
    const transaction = db.transaction(['satellites'], 'readwrite');
    const store = transaction.objectStore('satellites');

    // Clear existing data
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    // Store new data
    for (const satellite of data) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(satellite);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    }

    console.log('Satellite data stored in IndexedDB');
  } catch (error) {
    console.error('Error storing satellite data in IndexedDB:', error);
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
    console.log('Received satellite data:', data); // Debug log
    
    // Store the data in IndexedDB
    await storeSatelliteData(data);
    
    return data;
  } catch (error) {
    console.error('Error fetching satellite positions:', error);
    return [];
  }
};

// Function to retrieve data from IndexedDB
export const getSatelliteDataFromDB = async (): Promise<CelestrakResponse[]> => {
  try {
    const db = await initDB();
    const transaction = db.transaction(['satellites'], 'readonly');
    const store = transaction.objectStore('satellites');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error retrieving satellite data from IndexedDB:', error);
    return [];
  }
};

// Example usage
const getSatelliteData = async (): Promise<CelestrakResponse[]> => {
  // First try to get data from IndexedDB
  const cachedData = await getSatelliteDataFromDB();
  const lastFetchTime = cachedData.length > 0 ? Math.min(...cachedData.map(sat => sat.fetchTime.getTime())) : null;
  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

  if (lastFetchTime && lastFetchTime > oneHourAgo.getTime()) {
    console.log('Retrieved satellite data from IndexedDB');
    return cachedData;
  }
  
  // If no cached data, fetch from API
  return fetchSatellitePositions();
};

export default getSatelliteData;
