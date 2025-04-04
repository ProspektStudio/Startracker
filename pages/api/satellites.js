// This is your proxy server endpoint
export default async function handler(req, res) {
    // Log incoming request
    console.log('Proxy received request for satellites:', req.query.satellites);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    try {
      // Get satellite IDs from query parameters
      const { satellites } = req.query;
      
      if (!satellites) {
        return res.status(400).json({ error: 'No satellite IDs provided' });
      }
  
      // Test with a single API call first
      const celestrakUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${satellites}&FORMAT=json`;
      console.log('Calling Celestrak:', celestrakUrl);

      const response = await fetch(celestrakUrl);
  
      if (!response.ok) {
        throw new Error(`Celestrak API error: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log('Received data from Celestrak:', data);
      
      // Add caching headers (cache for 5 seconds)
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate');
      
      // Send data back to client
      res.status(200).json(data);
      
    } catch (error) {
      console.error('Proxy server error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch satellite data',
        message: error.message 
      });
    }
  }