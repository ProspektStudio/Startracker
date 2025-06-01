const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.startracker.app';

const get = async(path: string) => {
  try {
    const res = await fetch(`${API_URL}${path}`);
    return res.json();
  } catch (e) {
    console.error(`Error during get ${path}: `, e)
  }
}

export default {

  async hello () {
    try {
      const data = await get('/api/hello');
      console.log(data);
      return data;
    } catch (e) {
      console.error(e)
    }
  },

  async streamSatelliteInfo(agent: string, group: string, name: string, onChunk: (chunk: string) => void) {
    const response = await fetch(`${API_URL}/api/satellite-info-${agent}?group=${group}&name=${name}`);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) return;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }
}
