import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import Spinner from './Spinner';
import apiClient from '@/services/apiClient';
import { createPortal } from 'react-dom';

interface AiInfoProps {
  selectedSatellite: {
    name: string;
    group: string;
  } | null;
}

enum Agent {
  LLM = 'llm',
  RAG = 'rag',
}

const agentInfo: Record<string, { name: string; description: string }> = {
  [Agent.LLM]: {
    name: 'Large Language Model',
    description: 'Gemini 2.0 Flash is a large language model that can generate text responses to questions.',
  },
  [Agent.RAG]: {
    name: 'Retrieval Augmented Generation',
    description: "Retrieval Augmented Generation (RAG) implementation uses Google's Vertex AI for embeddings and Gemini 2.0 Flash as the LLM, with LangChain providing the framework. The system loads satellite-related documents, processes them into chunks, stores them in an in-memory vector store, and retrieves relevant information and generates satellite information.",
  },
}

const AiInfo: React.FC<AiInfoProps> = ({ selectedSatellite }) => {

  if (!selectedSatellite) return null;

  const [agent, setAgent] = useState<keyof typeof agentInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [llmSatelliteInfo, setLlmSatelliteInfo] = useState<string>('');
  const [ragSatelliteInfo, setRagSatelliteInfo] = useState<string>('');
  const satelliteInfo = agent === null ? '' : (agent === Agent.LLM ? llmSatelliteInfo : ragSatelliteInfo);

  useEffect(() => {
    setAgent(null);
    setLlmSatelliteInfo('');
    setRagSatelliteInfo('');
  }, [selectedSatellite]);

  const onAgentSelect = async (agent: keyof typeof agentInfo) => {
    
    // Check if we already have info for this agent
    const currentInfo = agent === Agent.LLM ? llmSatelliteInfo : ragSatelliteInfo;
    if (currentInfo) {
      setAgent(agent);
      return;
    }

    setAgent(agent);
    const setSatelliteInfo = agent === Agent.LLM ? setLlmSatelliteInfo : setRagSatelliteInfo;

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

  return (
    <>
      <div className="toggle-buttons">
        {Object.keys(agentInfo).map((key: keyof typeof agentInfo) => (
          <button
            key={key}
            className={`toggle-button w-full flex items-center justify-center gap-2 ${agent === key ? 'active' : ''}`}
            onClick={() => onAgentSelect(key)}
          >
            <span className="pt-1">{key.toUpperCase()}</span>
            <Tooltip agent={key as Agent} text={agentInfo[key].description} />
          </button>
        ))}
      </div>

      <div className="satellite-info">
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="markdown-content" dangerouslySetInnerHTML={{ __html: marked(satelliteInfo || '') }} />
        )}
      </div>

      <style jsx>{`
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
          align-items: center;
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
    </>
  );
};

const Tooltip = ({ agent, text }: { agent: Agent, text: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <span 
        style={{ 
          cursor: 'help',
          position: 'relative',
          display: 'inline-block'
        }} 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </span>
      {mounted && showTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: `translate(${agent === Agent.LLM ? '-30%' : '-80%'}, -100%)`,
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
            pointerEvents: 'none',
            width: '300px',
            marginTop: '-8px'
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
};

export default AiInfo;
