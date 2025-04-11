interface FPSCounterProps {
  fps: number;
}

const FPSCounter: React.FC<FPSCounterProps> = ({ fps }) => {
  return (
    <div
      style={{
        padding: '10px 20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: fps >= 30 ? '#4ade80' : fps >= 20 ? '#fbbf24' : '#ef4444',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {fps} FPS
    </div>
  );
};

export default FPSCounter; 