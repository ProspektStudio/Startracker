import React from 'react';
import { SatelliteData } from '@/services/types';
import { useQuery } from '@tanstack/react-query';
import { marked } from 'marked';
import Spinner from './Spinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.startracker.app';

interface SidePanelProps {
  satellite: SatelliteData;
}

interface SatelliteInfoResponse {
  satellite_info: string;
}

const fetchSatelliteInfo = async (group: string, name: string): Promise<string> => {
  const response = await fetch(`${API_URL}/api/satellite-info?group=${group}&name=${name}`);
  const data = await response.json() as SatelliteInfoResponse;
  return data.satellite_info;
};

const SidePanel: React.FC<SidePanelProps> = ({ satellite }) => {
  if (!satellite) return null;

  const [satelliteInfo, setSatelliteInfo] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const fetchSatelliteInfoInChuncks = async (group: string, name: string): Promise<void> => {
    setSatelliteInfo('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/satellite-info-stream?group=${group}&name=${name}`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setIsLoading(false);
        setSatelliteInfo(prev => prev + chunk);
      }
    } catch (error) {
      setSatelliteInfo('Error fetching satellite info');
      console.error('Error fetching satellite info in chunks:', error);
    }
  };

  React.useEffect(() => {
    if (satellite) {
      fetchSatelliteInfoInChuncks(satellite.group, satellite.name);
    }
  }, [satellite]);

  return (
    <div className="side-panel">
      <h2>{satellite.name}</h2>
      <div className="satellite-info">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked(satelliteInfo || '') }} />
        )}
      </div>

      <style jsx>{`
        .side-panel {
          position: fixed;
          right: 0;
          top: 0;
          width: 400px;
          height: 100%;
          background: rgba(25, 25, 25, 0.85);
          color: white;
          padding: 20px;
          box-shadow: -2px 0 5px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          overflow-y: auto;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 5px 10px;
        }

        .close-button:hover {
          color: #ccc;
        }

        h2 {
          margin-top: 30px;
          margin-bottom: 20px;
          font-size: 1.5em;
        }

        .satellite-info {
          margin-top: 20px;
        }

        .satellite-info p {
          margin: 10px 0;
          font-size: 14px;
          white-space: pre-wrap;
        }

        strong {
          color: #88ccff;
        }

        .markdown-content {
          margin: 10px 0;
          font-size: 14px;
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3 {
          color: #88ccff;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }

        .markdown-content p {
          margin: 0.5em 0;
        }

        .markdown-content ul,
        .markdown-content ol {
          margin-left: 1.5em;
        }
      `}</style>
    </div>
  );
};

export default SidePanel;
