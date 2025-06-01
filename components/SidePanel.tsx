import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import Spinner from './Spinner';
import apiClient from '@/services/apiClient';
import CurrentlyViewing from './CurrentlyViewing';
import useClientStore from '@/services/clientStore';

const SidePanel: React.FC = () => {
  const { selectedSatellite } = useClientStore();

  const [satelliteInfo, setSatelliteInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agent, setAgent] = useState<string>('gemini');
  const [isHovered, setIsHovered] = useState(false);
  const [isGettingInfo, setIsGettingInfo] = useState(false);

  const fetchSatelliteInfoInChuncks = async (): Promise<void> => {
    setSatelliteInfo('');
    setIsLoading(true);
    if (!selectedSatellite) return;
    try {
      await apiClient.streamSatelliteInfo(agent, selectedSatellite.group, selectedSatellite.name, (chunk) => {
        setIsLoading(false);
        setSatelliteInfo(prev => prev + chunk);
      });
    } catch (error) {
      setSatelliteInfo('Error fetching satellite info');
      setIsLoading(false);
      console.error('Error fetching satellite info:', error);
    }
  };

  useEffect(() => {
    setIsGettingInfo(false);
    setSatelliteInfo('');
  }, [selectedSatellite]);

  useEffect(() => {
    if (isGettingInfo) {
      fetchSatelliteInfoInChuncks();
    }
  }, [isGettingInfo]);

  return (
    <div className="side-panel">
      <CurrentlyViewing />
      {selectedSatellite && (
        <>
          <h2>{selectedSatellite.name}</h2>

          {!isGettingInfo && (
            <p>
              <button 
                onClick={() => setIsGettingInfo(true)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                  width: 'calc(100% - 48px)',
                  marginBottom: '16px',
                  padding: '8px 16px',
                  background: isHovered ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.8)',
                  border: '1px solid rgba(147, 197, 253, 0.3)',
                  borderRadius: '4px',
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'Shentox',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  transform: isHovered ? 'translateY(-1px)' : 'none'
                }}
              >
                Get AI-Powered Satellite Info
              </button>
            </p>
          )}

          {isGettingInfo && (
            <>
              <div className="toggle-buttons">
                <button
                  className={`toggle-button ${agent === 'gemini' ? 'active' : ''}`}
                  onClick={() => setAgent('gemini')}
                >
                  Gemini
                </button>
                <button
                  className={`toggle-button ${agent === 'rag' ? 'active' : ''}`}
                  onClick={() => setAgent('rag')}
                >
                  RAG
                </button>
              </div>
              <p>
                <b>{agent === 'gemini' ? 'Google Gemini 2.0 Flash' : 'Retrieval Augmented Generation'}</b>
                <span 
                  style={{ 
                    marginLeft: '8px', 
                    cursor: 'help',
                    position: 'relative',
                    display: 'inline-block'
                  }} 
                  onMouseEnter={(e) => {
                    const tooltip = document.createElement('div');
                    tooltip.style.cssText = `
                      position: absolute;
                      bottom: 100%;
                      left: 50%;
                      transform: translateX(${agent === 'gemini' ? '-50%' : '-60%'});
                      padding: 8px;
                      background: rgba(0, 0, 0, 0.8);
                      color: white;
                      border-radius: 4px;
                      font-size: 12px;
                      z-index: 1000;
                      pointer-events: none;
                      width: 300px;
                    `;
                    tooltip.textContent = `${agent === 'gemini' 
                      ? 'Gemini 2.0 Flash is a large language model that can generate text responses.' 
                      : "RAG (Retrieval Augmented Generation) implementation uses Google's Vertex AI for embeddings and Gemini 2.0 Flash as the LLM, with LangChain providing the framework. The system loads satellite-related documents, processes them into chunks, stores them in an in-memory vector store, and retrieves relevant information and generates satellite information."}`;
                    e.currentTarget.appendChild(tooltip);
                  }}
                  onMouseLeave={(e) => {
                    const tooltip = e.currentTarget.querySelector('div');
                    if (tooltip) {
                      tooltip.remove();
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </span>
              </p>
            </>
          )}

          <div className="satellite-info">
            {isLoading ? (
              <Spinner />
            ) : (
              <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked(satelliteInfo || '') }} />
            )}
          </div>
        </>
      )}
      <style jsx>{`
        .side-panel {
          width: 400px;
          height: 100%;
          background: rgba(25, 25, 25, 0.85);
          color: white;
          padding: 32px;
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

        .toggle-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .toggle-button {
          padding: 8px 16px;
          border: 1px solid #666;
          background: transparent;
          color: white;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .toggle-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .toggle-button.active {
          background: #666;
        }
      `}</style>
    </div>
  );
};

export default SidePanel;
