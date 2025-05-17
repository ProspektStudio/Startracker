const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.startracker.app';

export default {

  async get(path: string) {
    const res = await fetch(`${API_URL}${path}`);
    return res.json();
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
