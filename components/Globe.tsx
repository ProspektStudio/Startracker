import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import getSatelliteData from '@/services/data';
import { SatelliteData } from '@/services/types';
import SidePanel from './SidePanel';
import FPSCounter from './FPSCounter';
import SatellitePopup from './SatellitePopup';

interface SatelliteMesh {
  mesh: THREE.Sprite;
  data: SatelliteData;
  phase: number;
  material: THREE.SpriteMaterial;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

interface SatellitePosition {
  NORAD_CAT_ID: string;
  x: number;
  y: number;
  z: number;
}

interface TLE {
  name: string;
  tleLine1: string;
  tleLine2: string;
}

const Globe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [globe, setGlobe] = useState<THREE.Mesh | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
  const [popup, setPopup] = useState<PopupState>({ visible: false, data: null, x: 0, y: 0 });
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const animationRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const satelliteMeshesRef = useRef<SatelliteMesh[]>([]);
  const [fps, setFps] = useState<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Constants
  const GLOBE_RADIUS = 5;
  const SATELLITE_SIZE = 0.15;
  const ORBIT_SPEED = 0.000001;

  // Constants for realistic orbital heights (in Earth radii)
  const EARTH_RADIUS = 6371;

  // Add initial camera position reference
  const initialCameraPosition = useRef<THREE.Vector3 | null>(null);
  const initialControlsTarget = useRef<THREE.Vector3 | null>(null);

  // Setup Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Init scene
    const newScene = new THREE.Scene();
    const newCamera = new THREE.PerspectiveCamera(
      75, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );

    const newRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });

    newRenderer.setSize(
      containerRef.current.clientWidth, 
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(newRenderer.domElement);

    // Position camera
    newCamera.position.z = 12;
    
    // Store initial camera position and target
    initialCameraPosition.current = newCamera.position.clone();
    initialControlsTarget.current = new THREE.Vector3(0, 0, 0);

    // Create Earth
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/earth-8k.webp');
    
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color(0x333333),
      shininess: 5,
      bumpScale: 0.02
    });

    const newGlobe = new THREE.Mesh(globeGeometry, globeMaterial);
    newScene.add(newGlobe);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    newScene.add(directionalLight);

    // Create satellites
    createSatellites(newScene, textureLoader)
        .then(allSatellites => console.log(`Created ${allSatellites.length} satellites`));

    // Set up OrbitControls
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.rotateSpeed = 0.5;
    newControls.minDistance = 7;
    newControls.maxDistance = 20;

    // Initialize raycaster and mouse
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Store everything in state/refs
    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setGlobe(newGlobe);
    setControls(newControls);

    // Add hover handler for tooltip
    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !newCamera || !newScene || !raycasterRef.current || !mouseRef.current) return;

      const rect = newRenderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);
      const intersects = raycasterRef.current.intersectObjects(satelliteMeshesRef.current.map(sat => sat.mesh));

      if (intersects.length > 0) {
        const satelliteMesh = intersects[0].object;
        const satelliteData = satelliteMeshesRef.current.find(sat => sat.mesh === satelliteMesh);

        if (satelliteData) {
          setTooltip({
            visible: true,
            text: satelliteData.data.name,
            x: event.clientX,
            y: event.clientY - 10
          });
        }
      } else {
        setTooltip({ visible: false, text: '', x: 0, y: 0 });
      }
    };

    // Add click handler for satellites
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current || !newCamera || !newScene || !raycasterRef.current || !mouseRef.current) return;

      const rect = newRenderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Reset all satellites to white first
      satelliteMeshesRef.current.forEach(sat => {
        sat.mesh.material.color.set(0xffffff);
      });

      // Set up raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);
      const intersects = raycasterRef.current.intersectObjects(newScene.children, true);

      // Find any intersected Sprite (satellite)
      const satelliteIntersect = intersects.find(obj => obj.object instanceof THREE.Sprite);

      if (satelliteIntersect) {
        const clickedSprite = satelliteIntersect.object as THREE.Sprite;
        const satelliteData = satelliteMeshesRef.current.find(
          sat => sat.mesh === clickedSprite
        );

        if (satelliteData) {
          // Change color to blue
          console.log('clickedSprite', clickedSprite);
          clickedSprite.material.color.set(0x00a2ff);

          // Get the satellite's position for camera movement
          const satellitePosition = new THREE.Vector3();
          clickedSprite.getWorldPosition(satellitePosition);

          // Calculate the target camera position
          const direction = satellitePosition.clone().normalize();
          const distance = 8;
          const targetPosition = satellitePosition.clone().add(direction.multiplyScalar(distance));

          // Animate camera movement
          if (newControls) {
            // Disable controls during animation
            newControls.enabled = false;

            // Store initial camera position and target
            const startPosition = newCamera.position.clone();
            const startTarget = newControls.target.clone();
            const endTarget = satellitePosition;

            // Animation duration in milliseconds
            const duration = 1000;
            const startTime = Date.now();

            const animateCamera = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // Ease function (cubic ease-out)
              const ease = 1 - Math.pow(1 - progress, 3);

              // Interpolate camera position
              newCamera.position.lerpVectors(startPosition, targetPosition, ease);

              // Interpolate control target
              newControls.target.lerpVectors(startTarget, endTarget, ease);
              newControls.update();

              if (progress < 1) {
                requestAnimationFrame(animateCamera);
              } else {
                // Re-enable controls after animation
                newControls.enabled = true;
              }
            };

            animateCamera();
          }

          // Update popup position
          const vector = new THREE.Vector3();
          clickedSprite.getWorldPosition(vector);
          vector.project(newCamera);

          const x = (vector.x + 1) * rect.width / 2 + rect.left;
          const y = (-vector.y + 1) * rect.height / 2 + rect.top;

          setPopup({
            visible: true,
            data: satelliteData.data,
            x: x,
            y: y
          });
        }
      } else {
        setPopup({ visible: false, data: null, x: 0, y: 0 });
      }
    };

    newRenderer.domElement.addEventListener('mousemove', onMouseMove);
    newRenderer.domElement.addEventListener('click', onClick);

    // Animation loop
    const animate = () => {
      const now = performance.now();
      
      // Calculate FPS
      const deltaTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      
      frameTimesRef.current.push(deltaTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
      
      // Calculate average FPS over the last 60 frames
      const averageDeltaTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const currentFps = Math.round(1000 / averageDeltaTime);
      
      setFps(currentFps);

      animationRef.current = requestAnimationFrame(animate);
      
      satelliteMeshesRef.current.forEach(sat => {
        // Kepler's Third Law: orbital period is proportional to semi-major axis^(3/2)
        const orbitalSpeed = ORBIT_SPEED * Math.pow(sat.data.orbit.height, -1.5);
        sat.phase = (sat.phase + orbitalSpeed) % (Math.PI * 2);
        
        const radius = GLOBE_RADIUS * (1 + sat.data.orbit.height);
        const inclination = sat.data.orbit.inclination;
        
        const x = Math.cos(sat.phase) * radius;
        const y = Math.sin(sat.phase) * radius * Math.sin(inclination);
        const z = Math.sin(sat.phase) * radius * Math.cos(inclination);
        
        sat.mesh.position.set(x, y, z);
      });
      
      if (newControls) newControls.update();
      if (newRenderer && newScene && newCamera) {
        newRenderer.render(newScene, newCamera);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (newRenderer.domElement) {
        newRenderer.domElement.removeEventListener('mousemove', onMouseMove);
        newRenderer.domElement.removeEventListener('click', onClick);
      }
      if (containerRef.current && newRenderer) {
        containerRef.current.removeChild(newRenderer.domElement);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const createSatellites = async (scene: THREE.Scene, textureLoader: THREE.TextureLoader): Promise<SatelliteMesh[]> => {
    try {
      const satelliteData = await getSatelliteData();
      const satelliteMeshes: SatelliteMesh[] = [];
      
      satelliteData.forEach(satData => {
        if (!satData.NORAD_CAT_ID) return;
        
        // Calculate orbital parameters
        // Semi-major axis in Earth radii (derived from mean motion)
        const semiMajorAxis = Math.pow(398600.4418 / (Math.pow(satData.MEAN_MOTION * 2 * Math.PI / 86400, 2)), 1/3) / EARTH_RADIUS;
        
        // Convert orbital elements to radians where needed
        const inclination = satData.INCLINATION * (Math.PI / 180);
        const raan = satData.RA_OF_ASC_NODE * (Math.PI / 180);
        const argPerigee = satData.ARG_OF_PERICENTER * (Math.PI / 180);
        const meanAnomaly = satData.MEAN_ANOMALY * (Math.PI / 180);
        
        // Create satellite data object
        const satelliteData: SatelliteData = {
          name: satData.OBJECT_NAME,
          noradId: satData.NORAD_CAT_ID,
          orbit: {
            height: semiMajorAxis * (1 - satData.ECCENTRICITY) - 1, // Perigee height in Earth radii
            inclination: inclination,
            phase: meanAnomaly // Use mean anomaly as initial phase
          },
          rawData: satData
        };
        
        // Create and add the satellite mesh
        const satMesh = createSatelliteMesh(scene, textureLoader, satelliteData);
        
        // Calculate initial position
        const radius = GLOBE_RADIUS * (1 + satelliteData.orbit.height);
        const x = Math.cos(meanAnomaly) * radius;
        const y = Math.sin(meanAnomaly) * radius * Math.sin(inclination);
        const z = Math.sin(meanAnomaly) * radius * Math.cos(inclination);
        
        // Apply coordinate transformations for RAAN and argument of perigee
        const position = new THREE.Vector3(x, y, z);
        
        // Rotate by argument of perigee
        position.applyAxisAngle(new THREE.Vector3(0, 1, 0), argPerigee);
        
        // Rotate by RAAN
        position.applyAxisAngle(new THREE.Vector3(0, 0, 1), raan);
        
        satMesh.mesh.position.copy(position);
        satelliteMeshes.push(satMesh);
      });
      
      // Store the satellite meshes in the ref for animation updates
      satelliteMeshesRef.current = satelliteMeshes;
      
      setSatellites(satelliteMeshes.map(sat => sat.data));
      
      return satelliteMeshes;
    } catch (error) {
      console.error('Error creating satellite positions:', error);
      return [];
    }
  };

  // Update the createSatelliteMesh function
  const createSatelliteMesh = (scene: THREE.Scene, textureLoader: THREE.TextureLoader, satData: SatelliteData): SatelliteMesh => {
    const satelliteTexture = textureLoader.load('/dot-medium.13d7e8cb.png');
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: satelliteTexture,
      color: 0xffffff,
      sizeAttenuation: true
    });
    
    const satelliteSprite = new THREE.Sprite(spriteMaterial);
    satelliteSprite.scale.set(SATELLITE_SIZE, SATELLITE_SIZE, 1);
    
    scene.add(satelliteSprite);
    
    return {
      mesh: satelliteSprite,
      data: satData,
      phase: satData.orbit.phase,
      material: spriteMaterial
    };
  };

  // Add reset camera function
  const resetCamera = () => {
    if (!camera || !controls || !initialCameraPosition.current || !initialControlsTarget.current) return;

    // Reset all satellites to white
    satelliteMeshesRef.current.forEach(sat => {
      sat.material.color.setHex(0xffffff);
    });

    // Disable controls during animation
    controls.enabled = false;

    // Store current positions
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPosition = initialCameraPosition.current;
    const endTarget = initialControlsTarget.current;

    // Animation duration in milliseconds
    const duration = 1000;
    const startTime = Date.now();

    const animateReset = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease function (cubic ease-out)
      const ease = 1 - Math.pow(1 - progress, 3);

      // Interpolate camera position
      camera.position.lerpVectors(startPosition, endPosition, ease);

      // Interpolate control target
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      } else {
        // Re-enable controls after animation
        controls.enabled = true;
        // Reset popup
        setPopup({ visible: false, data: null, x: 0, y: 0 });
      }
    };

    animateReset();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 1000,
      }}>
        {/* Center Earth Button */}
        <button
          onClick={resetCamera}
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Center Earth
        </button>

        {/* FPS Counter */}
        <FPSCounter fps={fps} />
      </div>

      {tooltip.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '14px',
            pointerEvents: 'none',
            zIndex: 1000,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.text}
        </div>
      )}
      
      {popup.visible && popup.data && (
        <SatellitePopup
          data={popup.data}
          x={popup.x}
          y={popup.y}
        />
      )}
      <SidePanel satellites={satellites} />
    </div>
  );
};

export default Globe;
