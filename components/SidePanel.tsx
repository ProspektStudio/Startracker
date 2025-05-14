import React, { useEffect, useState } from 'react';
import { SatelliteData } from '@/services/types';
import { marked } from 'marked';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.startracker.app';

interface SidePanelProps {
  satellite: SatelliteData;
}

interface SatelliteInfoResponse {
  satellite_info: string;
}

const SidePanel: React.FC<SidePanelProps> = ({ satellite }) => {
  if (!satellite) return null;
  const [loading, setLoading] = useState(true);
  const [satelliteInfo, setSatelliteInfo] = useState<string | null>(null);

  const getSatelliteInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/satellite-info?group=${satellite.group}&name=${satellite.name}`);
      const data = await response.json() as SatelliteInfoResponse;
      setSatelliteInfo(data.satellite_info);
    } catch (error) {
      console.error('Error fetching satellite info:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getSatelliteInfo();
  }, [satellite]);

  return (
    <div className="side-panel">
      <h2>{satellite.name}</h2>
      <div className="satellite-info">
        {loading ? (
          <p>Loading AI-Powered Satellite Info...</p>
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
