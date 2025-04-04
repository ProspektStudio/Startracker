import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { feature } from 'topojson-client';
import { CelestrakResponse } from '../types/celestrak';

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
  const [satellites, setSatellites] = useState<SatelliteMesh[]>([]);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<number>(5000);
  const satelliteMeshesRef = useRef<SatelliteMesh[]>([]);

  // Constants
  const GLOBE_RADIUS = 5;
  const SATELLITE_SIZE = 0.15;
  const SATELLITE_ORBIT_HEIGHT = 0.5;
  const ORBIT_POINTS = 100;
  const ORBIT_SPEED = 0.001;
  const ORBIT_HEIGHT = GLOBE_RADIUS + 0.5;

  // Constants for realistic orbital heights (in Earth radii)
  const EARTH_RADIUS = 6371;
  const ORBIT_HEIGHTS = {
    LEO: (400 / EARTH_RADIUS),
    STARLINK: (550 / EARTH_RADIUS),
    MEO: (20200 / EARTH_RADIUS),
    GEO: (35786 / EARTH_RADIUS),
  };

  // Sample satellite TLEs (Two-Line Element sets)
  const sampleTLEs: TLE[] = [
    {
      name: 'ISS (ZARYA)',
      tleLine1: '1 25544U 98067A   23158.54037539  .00010780  00000+0  19952-3 0  9997',
      tleLine2: '2 25544  51.6415 183.9210 0002857 272.8083 223.7602 15.50266779399615'
    },
    {
      name: 'HUBBLE',
      tleLine1: '1 20580U 90037B   23158.48945205  .00000487  00000+0  16703-4 0  9993',
      tleLine2: '2 20580  28.4699 232.9546 0001366 123.1235 288.8670 15.09911698329906'
    },
    {
      name: 'NOAA 19',
      tleLine1: '1 33591U 09005A   23158.51068378  .00000145  00000+0  95263-4 0  9996',
      tleLine2: '2 33591  99.1691 206.1636 0013408 292.0608  67.9148 14.12523886735536'
    },
    {
      name: 'STARLINK-1019',
      tleLine1: '1 44713U 19074A   23158.48670347  .00014382  00000+0  91466-3 0  9996',
      tleLine2: '2 44713  53.0540 226.3036 0001341  83.5596 276.5526 15.16353248189853'
    },
    {
      name: 'GPS IIR-10',
      tleLine1: '1 28129U 03058A   23158.12083121 -.00000056  00000+0  00000+0 0  9990',
      tleLine2: '2 28129  56.4575 161.3485 0131510 261.5296 196.9329  2.00562592143236'
    }
  ];

  // Sample satellite TLEs (Two-Line Element sets)
  const sampleSatellites = [
    { name: 'ISS (ZARYA)', noradId: '25544' },
    { name: 'HUBBLE', noradId: '20580' },
    { name: 'NOAA 19', noradId: '33591' },
    { name: 'STARLINK-1019', noradId: '44713' },
    { name: 'GPS IIR-10', noradId: '28129' }
  ];

  // Update the test satellites array to include both orbit and initial coordinates
  // const testSatellites: SatelliteData[] = [
  //   { 
  //     name: 'ISS (ZARYA)', 
  //     noradId: '25544',
  //     coordinates: { lat: 51.6415, long: 183.9210 },
  //     orbit: {
  //       height: ORBIT_HEIGHTS.LEO,
  //       inclination: 51.6415 * (Math.PI / 180),
  //       phase: 0
  //     }
  //   },
  //   { 
  //     name: 'HUBBLE', 
  //     noradId: '20580',
  //     coordinates: { lat: 28.4699, long: 232.9546 },
  //     orbit: {
  //       height: ORBIT_HEIGHTS.LEO,
  //       inclination: 28.4699 * (Math.PI / 180),
  //       phase: Math.PI / 2
  //     }
  //   },
  //   { 
  //     name: 'NOAA 19', 
  //     noradId: '33591',
  //     coordinates: { lat: 99.1691, long: 206.1636 },
  //     orbit: {
  //       height: ORBIT_HEIGHTS.LEO,
  //       inclination: 99.1691 * (Math.PI / 180),
  //       phase: Math.PI
  //     }
  //   },
  //   { 
  //     name: 'STARLINK-1019', 
  //     noradId: '44713',
  //     coordinates: { lat: 53.0540, long: 226.3036 },
  //     orbit: {
  //       height: ORBIT_HEIGHTS.STARLINK,
  //       inclination: 53.0540 * (Math.PI / 180),
  //       phase: 3 * Math.PI / 2
  //     }
  //   },
  //   { 
  //     name: 'GPS IIR-10', 
  //     noradId: '28129',
  //     coordinates: { lat: 56.4575, long: 161.3485 },
  //     orbit: {
  //       height: ORBIT_HEIGHTS.MEO,
  //       inclination: 56.4575 * (Math.PI / 180),
  //       phase: Math.PI / 4
  //     }
  //   }
  // ];

  // Add this helper function to convert lat/long to 3D coordinates
  const latLongToVector3 = (latitude: number, longitude: number, radius: number): THREE.Vector3 => {
    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  // Add this helper function to create orbital path
  const createOrbitPath = (inclination: number, radius: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= ORBIT_POINTS; i++) {
      const angle = (i / ORBIT_POINTS) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * Math.sin(inclination);
      const z = Math.sin(angle) * radius * Math.cos(inclination);
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  };

  // // Generate satellites with more realistic parameters
  // const generateSatellites = (): SatelliteData[] => {
  //   const satellites: SatelliteData[] = [
  //     // ISS - Low Earth Orbit
  //     { 
  //       name: 'ISS (ZARYA)', 
  //       noradId: '25544',
  //       orbit: {
  //         height: ORBIT_HEIGHTS.LEO,
  //         inclination: 51.6415 * (Math.PI / 180),
  //         phase: 0
  //       }
  //     },

  //     // Starlink satellites - 550km orbit
  //     ...Array.from({ length: 60 }, (_, i) => ({
  //       name: `STARLINK-${1000 + i}`,
  //       noradId: `44713${i.toString().padStart(2, '0')}`,
  //       orbit: {
  //         height: ORBIT_HEIGHTS.STARLINK,
  //         inclination: 53 * (Math.PI / 180),
  //         phase: (i / 60) * Math.PI * 2
  //       }
  //     })),

  //     // GPS satellites - 20,200km orbit
  //     ...Array.from({ length: 24 }, (_, i) => ({
  //       name: `GPS-${i + 1}`,
  //       noradId: `4014${i.toString().padStart(2, '0')}`,
  //       orbit: {
  //         height: ORBIT_HEIGHTS.MEO,
  //         inclination: 55 * (Math.PI / 180),
  //         phase: (i / 24) * Math.PI * 2
  //       }
  //     })),

  //     // Geostationary satellites - 35,786km orbit
  //     ...Array.from({ length: 15 }, (_, i) => ({
  //       name: `GEO-${i + 1}`,
  //       noradId: `3837${i.toString().padStart(2, '0')}`,
  //       orbit: {
  //         height: ORBIT_HEIGHTS.GEO,
  //         inclination: 0,
  //         phase: (i / 15) * Math.PI * 2
  //       }
  //     }))
  //   ];

  //   return satellites;
  // };

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

    // Generate satellites
    // const allSatellites = generateSatellites();
    // console.log(`Created ${allSatellites.length} satellites`);

    // const satelliteMeshes = allSatellites.map(satData => 
    //   createSatelliteMesh(newScene, textureLoader, satData)
    // );
    
    // Set up OrbitControls
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.rotateSpeed = 0.5;
    newControls.minDistance = 7;
    newControls.maxDistance = 20;

    // Store everything in state/refs
    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setGlobe(newGlobe);
    setControls(newControls);
    // setSatellites(satelliteMeshes);
    // satelliteMeshesRef.current = satelliteMeshes;

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      satelliteMeshesRef.current.forEach(sat => {
        // Kepler's Third Law: orbital period is proportional to semi-major axis^(3/2)
        const orbitalSpeed = 0.001 * Math.pow(sat.data.orbit.height, -1.5);
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

    createSatellitePositions(newScene, textureLoader);
    // updateSatellitePositions(satelliteMeshesRef.current);

    // Cleanup
    return () => {
      if (containerRef.current && newRenderer) {
        containerRef.current.removeChild(newRenderer.domElement);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // clearInterval(updateInterval);
    };
  }, []);

  // const updateSatellitePositions = async (satelliteMeshes: SatelliteMesh[]) => {
  //   try {
  //     const satelliteIds = satelliteMeshes.map(sat => sat.data.noradId);
  //     const positions = await fetchSatellitePositions(satelliteIds);
      
  //     satelliteMeshes.forEach(sat => {
  //       const satData = positions.find(pos => pos.NORAD_CAT_ID === sat.data.noradId);
        
  //       if (!satData) return;
        
  //       // Convert Celestrak coordinates to lat/long
  //       const lat = satData.INCLINATION;
  //       const long = satData.RA_OF_ASC_NODE;
        
  //       // Update position
  //       const newPosition = latLongToVector3(
  //         lat * (180 / Math.PI),
  //         long * (180 / Math.PI),
  //         GLOBE_RADIUS + 0.5
  //       );
        
  //       sat.mesh.position.copy(newPosition);
  //     });
  //   } catch (error) {
  //     console.error('Error updating satellite positions:', error);
  //   }
  // };

  // Update the fetchSatellitePositions function to ensure it's correctly calling our proxy
  const fetchSatellitePositions = async (): Promise<CelestrakResponse[]> => {
    try {
      const group = 'stations';

      const response = await fetch(
        `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as CelestrakResponse[];
      console.log('Received satellite data:', data); // Debug log
      return data;
    } catch (error) {
      console.error('Error fetching satellite positions:', error);
      return [];
    }
  };

  const createSatellitePositions = async (scene: THREE.Scene, textureLoader: THREE.TextureLoader): Promise<SatelliteMesh[]> => {
    try {
      const positions = await fetchSatellitePositions();
      const satelliteMeshes: SatelliteMesh[] = [];
      
      positions.forEach(satData => {
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
