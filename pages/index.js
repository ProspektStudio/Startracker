import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamically import the Globe component with no SSR to avoid server-side rendering issues
const Globe = dynamic(() => import('../components/Globe'), { ssr: false });

export default function Home() {
  // Lighting control panel state
  const [showControls, setShowControls] = useState(false);
  const [lighting, setLighting] = useState({
    ambientIntensity: 0.3,
    ambientColor: '#404040',
    directionalIntensity: 1.0,
    directionalColor: '#ffffff',
    directionalPosition: { x: 5, y: 3, z: 5 },
    hemisphereIntensity: 0.5,
    hemisphereColorTop: '#0077ff',
    hemisphereColorBottom: '#004488'
  });

  // Helper to convert hex to number
  const hexToNumber = (hex) => parseInt(hex.replace('#', '0x'));

  // Update lighting in the Globe component
  const updateLighting = () => {
    if (typeof window !== 'undefined' && window.adjustLighting) {
      window.adjustLighting({
        ambientIntensity: parseFloat(lighting.ambientIntensity),
        ambientColor: hexToNumber(lighting.ambientColor),
        directionalIntensity: parseFloat(lighting.directionalIntensity),
        directionalColor: hexToNumber(lighting.directionalColor),
        directionalPosition: lighting.directionalPosition,
        hemisphereIntensity: parseFloat(lighting.hemisphereIntensity),
        hemisphereColorTop: hexToNumber(lighting.hemisphereColorTop),
        hemisphereColorBottom: hexToNumber(lighting.hemisphereColorBottom)
      });
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('directionalPosition.')) {
      const axis = name.split('.')[1];
      setLighting({
        ...lighting,
        directionalPosition: {
          ...lighting.directionalPosition,
          [axis]: parseFloat(value)
        }
      });
    } else {
      setLighting({
        ...lighting,
        [name]: value
      });
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Interactive Earth Globe</title>
        <meta name="description" content="Interactive 3D Earth Globe with coordinates" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        {/* Globe takes full height and width */}
        <Globe />
        
        {/* Lighting control toggle button */}
        <button 
          className="control-toggle" 
          onClick={() => setShowControls(!showControls)}
        >
          {showControls ? 'Hide' : 'Show'} Lighting Controls
        </button>
        
        {/* Lighting control panel */}
        {showControls && (
          <div className="control-panel">
            <h3>Lighting Controls</h3>
            
            <div className="control-group">
              <h4>Ambient Light</h4>
              <label>
                Intensity:
                <input 
                  type="range" 
                  name="ambientIntensity" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={lighting.ambientIntensity}
                  onChange={handleInputChange}
                />
                {lighting.ambientIntensity}
              </label>
              <label>
                Color:
                <input 
                  type="color" 
                  name="ambientColor" 
                  value={lighting.ambientColor}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            
            <div className="control-group">
              <h4>Directional Light (Sun)</h4>
              <label>
                Intensity:
                <input 
                  type="range" 
                  name="directionalIntensity" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={lighting.directionalIntensity}
                  onChange={handleInputChange}
                />
                {lighting.directionalIntensity}
              </label>
              <label>
                Color:
                <input 
                  type="color" 
                  name="directionalColor" 
                  value={lighting.directionalColor}
                  onChange={handleInputChange}
                />
              </label>
              <div className="position-controls">
                <label>
                  X Position:
                  <input 
                    type="range" 
                    name="directionalPosition.x" 
                    min="-10" 
                    max="10" 
                    step="0.5" 
                    value={lighting.directionalPosition.x}
                    onChange={handleInputChange}
                  />
                  {lighting.directionalPosition.x}
                </label>
                <label>
                  Y Position:
                  <input 
                    type="range" 
                    name="directionalPosition.y" 
                    min="-10" 
                    max="10" 
                    step="0.5" 
                    value={lighting.directionalPosition.y}
                    onChange={handleInputChange}
                  />
                  {lighting.directionalPosition.y}
                </label>
                <label>
                  Z Position:
                  <input 
                    type="range" 
                    name="directionalPosition.z" 
                    min="-10" 
                    max="10" 
                    step="0.5" 
                    value={lighting.directionalPosition.z}
                    onChange={handleInputChange}
                  />
                  {lighting.directionalPosition.z}
                </label>
              </div>
            </div>
            
            <div className="control-group">
              <h4>Hemisphere Light</h4>
              <label>
                Intensity:
                <input 
                  type="range" 
                  name="hemisphereIntensity" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={lighting.hemisphereIntensity}
                  onChange={handleInputChange}
                />
                {lighting.hemisphereIntensity}
              </label>
              <label>
                Sky Color:
                <input 
                  type="color" 
                  name="hemisphereColorTop" 
                  value={lighting.hemisphereColorTop}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Ground Color:
                <input 
                  type="color" 
                  name="hemisphereColorBottom" 
                  value={lighting.hemisphereColorBottom}
                  onChange={handleInputChange}
                />
              </label>
            </div>
            
            <button 
              className="apply-button"
              onClick={updateLighting}
            >
              Apply Lighting Changes
            </button>
          </div>
        )}
      </main>

      <style jsx>{`
        .container {
          width: 100%;
          height: 100%;
        }
        
        main {
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        .control-toggle {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 10;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: 1px solid white;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .control-panel {
          position: absolute;
          top: 60px;
          right: 10px;
          width: 300px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: 1px solid white;
          border-radius: 4px;
          padding: 15px;
          z-index: 10;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .control-group {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        h3, h4 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        input[type="range"] {
          width: 60%;
          margin: 0 10px;
        }
        
        .apply-button {
          width: 100%;
          padding: 8px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .apply-button:hover {
          background: #2980b9;
        }
      `}</style>
    </div>
  );
} 