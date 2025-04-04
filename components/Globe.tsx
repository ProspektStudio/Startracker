import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import getSatelliteData from '@/services/data';

interface SatelliteData {
  name: string;
  noradId: number;
  coordinates?: {
    lat: number;
    long: number;
  };
  orbit: {
    height: number;
    inclination: number;
    phase: number;
  };
}

interface SatelliteMesh {
  mesh: THREE.Sprite;
  data: SatelliteData;
  phase: number;
}

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

const Globe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [globe, setGlobe] = useState<THREE.Mesh | null>(null);
  const [satellites, setSatellites] = useState<SatelliteMesh[]>([]);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const satelliteMeshesRef = useRef<SatelliteMesh[]>([]);

  // Constants
  const GLOBE_RADIUS = 5;
  const SATELLITE_SIZE = 0.15;
  const ORBIT_SPEED = 0.000001;

  // Constants for realistic orbital heights (in Earth radii)
  const EARTH_RADIUS = 6371;

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

    // Add mouse move handler for tooltip
    const onMouseMove = (event: { clientX: number; clientY: number; }) => {
      if (!containerRef.current || !newCamera || !newScene || !raycasterRef.current || !mouseRef.current) return;

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / containerRef.current.clientWidth) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / containerRef.current.clientHeight) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);

      // Calculate objects intersecting the picking ray
      const intersects = raycasterRef.current.intersectObjects(newScene.children, true);

      // Find if we're hovering over a satellite
      const satelliteIntersect = intersects.find(intersect =>
          intersect.object instanceof THREE.Sprite
      );

      if (satelliteIntersect) {
        const satelliteMesh = satelliteIntersect.object;
        const satelliteData = satelliteMeshesRef.current.find(sat => sat.mesh === satelliteMesh);

        if (satelliteData) {
          setTooltip({
            visible: true,
            text: satelliteData.data.name,
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top + 10
          });
        }
      } else {
        setTooltip({ visible: false, text: '', x: 0, y: 0 });
      }
    };

    containerRef.current.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
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
          }
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
      phase: satData.orbit.phase
    };
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
            zIndex: 1000
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default Globe;
