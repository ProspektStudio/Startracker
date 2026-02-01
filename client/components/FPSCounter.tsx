'use client';

import { useEffect, useState } from 'react';
import useClientStore from '../hooks/useClientStore';

interface FPSCounterProps {
  fpsRef: React.MutableRefObject<number>;
  throttleMs?: number;
}

const FPSCounter: React.FC<FPSCounterProps> = ({ fpsRef, throttleMs = 500 }) => {
  const [displayedFps, setDisplayedFps] = useState(0);
  const satelliteCount = useClientStore((s) => s.satellites.length);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = fpsRef.current;
      setDisplayedFps(current);
    }, throttleMs);
    return () => clearInterval(interval);
  }, [fpsRef, throttleMs]);

  return (
    <div
      style={{
        padding: '10px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: displayedFps >= 30 ? '#4ade80' : displayedFps >= 20 ? '#fbbf24' : '#ef4444',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span>{displayedFps} FPS</span>
      <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{satelliteCount} sats</span>
    </div>
  );
};

export default FPSCounter;
