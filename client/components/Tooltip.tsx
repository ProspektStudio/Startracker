interface TooltipProps {
  text: string;
  x: number;
  y: number;
  selectedTooltip?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ text, x, y, selectedTooltip }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255)',
        borderColor: selectedTooltip ? '#00FF00' : 'rgba(255, 255, 255)',
        fontSize: '14px',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: selectedTooltip ? '0' : 'translate(-50%, -100%)',
      }}
    >
      {text}
    </div>
  );
};

export default Tooltip;
