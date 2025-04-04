import { NextApiRequest, NextApiResponse } from 'next';
import { CelestrakResponse } from '../../types/celestrak';

// This is your proxy server endpoint
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CelestrakResponse[] | { error: string; message?: string }>
) {
    // Log incoming request
    console.log('Proxy received request for satellites:', req.query.satellites);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
      // Get satellite IDs from query parameters
      const { group } = req.query;
      
      if (!group) {
        return res.status(400).json({ error: 'No group provided' });
      }
  
      // Query the "stations" group from Celestrak
      const celestrakUrl = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
      console.log('Calling Celestrak:', celestrakUrl);

      const response = await fetch(celestrakUrl);
  
      if (!response.ok) {
        throw new Error(`Celestrak API error: ${response.statusText}`);
      }
  
      const data: CelestrakResponse[] = await response.json();
      console.log('Received data from Celestrak:', data);
      
      // Add caching headers (cache for 5 seconds)
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
      
      // Send data back to client
      res.status(200).json(data);
      
    } catch (error) {
      console.error('Proxy server error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch satellite data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
}
