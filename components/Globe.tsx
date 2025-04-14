import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import getSatelliteData from '@/services/data';
import { SatelliteData } from '@/services/types';
import SidePanel from './SidePanel';
import FPSCounter from './FPSCounter';
import SatellitePopup from './SatellitePopup';
import SatelliteMenu from './SatelliteMenu';
import CurrentlyViewing from './CurrentlyViewing';

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
=======
interface PopupState {
  visible: boolean;
  data: SatelliteData | null;
  x: number;
  y: number;
}

interface CelestrakResponse {
  NORAD_CAT_ID: number;
  OBJECT_ID: string;
  OBJECT_NAME: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  fetchTime: Date;
}

interface PopupState {
  visible: boolean;
  data: SatelliteData | null;
  x: number;
  y: number;
}

interface CelestrakResponse {
  NORAD_CAT_ID: number;
  OBJECT_ID: string;
  OBJECT_NAME: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  fetchTime: Date;
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
  const [activeGroup, setActiveGroup] = useState<string>('stations');
  const [satelliteMeshes, setSatelliteMeshes] = useState<SatelliteMesh[]>([]);
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

  // Add orbit line state
  const [activeOrbit, setActiveOrbit] = useState<THREE.Line | null>(null);

  // Add refs for event handlers
  const onMouseMoveRef = useRef<((event: MouseEvent) => void) | null>(null);
  const handleClickRef = useRef<((event: MouseEvent) => void) | null>(null);

  // Add orbit lines ref
  const orbitLinesRef = useRef<THREE.Line[]>([]);

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

    // Set initial size
    const updateRendererSize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      newRenderer.setSize(width, height);
      newCamera.aspect = width / height;
      newCamera.updateProjectionMatrix();
    };

    // Initial size setup
    updateRendererSize();
    containerRef.current.appendChild(newRenderer.domElement);

    // Add resize handler
    const handleResize = () => {
      updateRendererSize();
    };
    window.addEventListener('resize', handleResize);

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

    // Set up OrbitControls
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.rotateSpeed = 0.5;
    newControls.minDistance = 5;
    newControls.maxDistance = 30;

    // Initialize raycaster and mouse
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Store everything in state/refs
    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setGlobe(newGlobe);
    setControls(newControls);

    // Define event handlers
    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !newCamera || !newScene || !raycasterRef.current || !mouseRef.current) return;

      const rect = newRenderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

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

    const handleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !newCamera || !newRenderer || !newControls) {
        return;
      }

      // Update mouse position
      const rect = newRenderer.domElement.getBoundingClientRect();

      if (!mouseRef.current) {
        return;
      }

      // Check for valid dimensions
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      
      // Calculate normalized device coordinates
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Check for valid coordinates
      if (!isFinite(x) || !isFinite(y)) {
        return;
      }

      mouseRef.current.x = x;
      mouseRef.current.y = y;

      // Set up raycaster
      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);

      // Get all satellite meshes
      const satelliteMeshes = satelliteMeshesRef.current.map(sat => sat.mesh);

      const intersects = raycasterRef.current.intersectObjects(satelliteMeshes, true);
      
      // Find any intersected Sprite (satellite)
      const satelliteIntersects = intersects.filter(obj => obj.object instanceof THREE.Sprite);
      
      if (satelliteIntersects.length > 0) {
        const clickedSprite = satelliteIntersects[0].object as THREE.Sprite;
        const satelliteData = satelliteMeshesRef.current.find(
          sat => sat.mesh === clickedSprite
        );

        if (satelliteData) {
          // Hide all orbit lines first
          orbitLinesRef.current.forEach(line => {
            if (line.material instanceof THREE.LineBasicMaterial) {
              line.material.opacity = 0;
            }
          });

          // Show the clicked satellite's orbit line
          const clickedIndex = satelliteMeshesRef.current.findIndex(sat => sat.mesh === clickedSprite);
          if (clickedIndex !== -1 && orbitLinesRef.current[clickedIndex]) {
            const lineMaterial = orbitLinesRef.current[clickedIndex].material as THREE.LineBasicMaterial;
            lineMaterial.opacity = 1;
          }

          // Get the satellite's position for camera movement
          const satellitePosition = new THREE.Vector3();
          clickedSprite.getWorldPosition(satellitePosition);

          // Create orbit line
          const orbitPoints = createOrbitLine(satelliteData.data);
          
          // Create new orbit line
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            depthTest: true,
            depthWrite: true,
            linewidth: 2
          });
          
          // Create continuous line instead of segments
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.renderOrder = 1;
          
          // Position the line at the Earth's center (0,0,0)
          line.position.set(0, 0, 0);
          
          // Scale the line to make it more visible
          line.scale.set(1.1, 1.1, 1.1);
          
          // Remove any existing orbit line first
          if (activeOrbit && scene) {
            scene.remove(activeOrbit);
          }
          
          // Add the new line to the scene
          if (scene) {
            scene.add(line);
            
            // Log the line's world position
            const lineWorldPosition = line.getWorldPosition(new THREE.Vector3());
          }
          
          // Store the new orbit line
          setActiveOrbit(line);

          // Change color to blue
          const whiteMaterial = new THREE.SpriteMaterial({
            map: clickedSprite.material.map,
            color: 0xffffff,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1,
            blending: THREE.NormalBlending
          });
          clickedSprite.material = whiteMaterial;
          satelliteData.material = whiteMaterial;

          // Calculate the target camera position
          // Position the camera at a fixed distance from the satellite
          const distance = 8;
          const direction = satellitePosition.clone().normalize();
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
                
                // Show popup only after animation is complete
                const screenPosition = satellitePosition.clone().project(newCamera);
                
                // Check if satellite is behind the globe (z > 1)
                if (screenPosition.z > 1) {
                  return;
                }
                
                const rect = newRenderer.domElement.getBoundingClientRect();
                
                // Position popup at bottom right of satellite dot with 1px spacing
                const dotSize = SATELLITE_SIZE * 100; // Convert to pixels
                let x = ((screenPosition.x * 0.5 + 0.5) * rect.width) + rect.left + dotSize + 1;
                let y = (-(screenPosition.y * 0.5 - 0.5) * rect.height) + rect.top + 1;
                
                // Ensure popup stays within viewport
                const popupWidth = 305;
                const popupHeight = 174;
                const padding = 10;
                
                // Adjust x position if popup would go off the right edge
                if (x + popupWidth > rect.right - padding) {
                  x = rect.right - popupWidth - padding;
                }
                // Adjust x position if popup would go off the left edge
                if (x < rect.left + padding) {
                  x = rect.left + padding;
                }
                
                // Adjust y position if popup would go off the bottom edge
                if (y + popupHeight > rect.bottom - padding) {
                  y = rect.bottom - popupHeight - padding;
                }
                // Adjust y position if popup would go off the top edge
                if (y < rect.top + padding) {
                  y = rect.top + padding;
                }
                
                // Add a small delay before showing the popup for smoother animation
                setTimeout(() => {
                  setPopup({
                    visible: true,
                    data: satelliteData.data,
                    x,
                    y
                  });
                }, 100);
              }
            };

            animateCamera();
          }
        }
      } else {
        // If clicking outside of a satellite, hide the popup and orbit line
        setPopup({ visible: false, data: null, x: 0, y: 0 });
        if (activeOrbit && scene) {
          scene.remove(activeOrbit);
          setActiveOrbit(null);
        }
      }
    };

    // Store event handlers in refs
    onMouseMoveRef.current = onMouseMove;
    handleClickRef.current = handleClick;

    // Create satellites
    createSatellites(newScene, textureLoader, activeGroup)
        .then(allSatellites => {
          // Add event listeners after satellites are created
          newRenderer.domElement.addEventListener('mousemove', onMouseMove);
          newRenderer.domElement.addEventListener('click', handleClick);
        });

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
      
      // Update satellite positions and orbit lines
      satelliteMeshesRef.current.forEach((sat, index) => {
        // Update satellite position
        const orbitalSpeed = ORBIT_SPEED * Math.pow(sat.data.orbit.height, -1.5);
        sat.phase = (sat.phase + orbitalSpeed) % (Math.PI * 2);
        
        const radius = GLOBE_RADIUS * (1 + sat.data.orbit.height);
        const inclination = sat.data.orbit.inclination;
        
        // Calculate position in orbital plane
        const x = Math.cos(sat.phase) * radius;
        const y = Math.sin(sat.phase) * radius;
        const z = 0;

        const position = new THREE.Vector3(x, y, z);
        
        // Apply rotations in the same order as orbit line:
        // 1. Inclination (rotate around x-axis)
        position.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
        
        // 2. Argument of perigee (rotate around z-axis)
        const argPerigee = sat.data.rawData.ARG_OF_PERICENTER * (Math.PI / 180);
        position.applyAxisAngle(new THREE.Vector3(0, 0, 1), argPerigee);
        
        // 3. RAAN (rotate around z-axis)
        const raan = sat.data.rawData.RA_OF_ASC_NODE * (Math.PI / 180);
        position.applyAxisAngle(new THREE.Vector3(0, 0, 1), raan);
        
        sat.mesh.position.copy(position);
      });
      
      if (newControls) newControls.update();
      if (newRenderer && newScene && newCamera) {
        newRenderer.render(newScene, newCamera);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (newRenderer.domElement && onMouseMoveRef.current && handleClickRef.current) {
        newRenderer.domElement.removeEventListener('mousemove', onMouseMoveRef.current);
        newRenderer.domElement.removeEventListener('click', handleClickRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && newRenderer) {
        containerRef.current.removeChild(newRenderer.domElement);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Remove all orbit lines
      orbitLinesRef.current.forEach(line => {
        if (scene) scene.remove(line);
      });
      orbitLinesRef.current = [];
    };
  }, []);

  const handleGroupSelect = async (group: string) => {
    // If clicking the same group, do nothing
    if (group === activeGroup) return;
    
    setActiveGroup(group);
    
    // Clear existing orbit lines
    if (scene) {
      orbitLinesRef.current.forEach(line => {
        scene.remove(line);
      });
      orbitLinesRef.current = [];
    }

    // Clear existing satellites from the scene
    if (scene) {
      satelliteMeshesRef.current.forEach(sat => {
        scene.remove(sat.mesh);
      });
      satelliteMeshesRef.current = [];
    }

    // Create new satellites for the selected group
    if (scene) {
      const textureLoader = new THREE.TextureLoader();
      const newSatelliteMeshes = await createSatellites(scene, textureLoader, group);
      satelliteMeshesRef.current = newSatelliteMeshes;
      setSatelliteMeshes(newSatelliteMeshes);
    }

    // Update the satellites state
    const satelliteData = await getSatelliteData(group);
    const allSatellites = satelliteData.map(sat => ({
      name: sat.OBJECT_NAME,
      noradId: sat.NORAD_CAT_ID,
      orbit: {
        height: sat.MEAN_MOTION,
        inclination: sat.INCLINATION,
        phase: sat.MEAN_ANOMALY
      },
      rawData: sat,
      position: {
        latitude: 0,
        longitude: 0,
        altitude: 0
      }
    }));
    setSatellites(allSatellites);
  };

  const createSatellites = async (scene: THREE.Scene, textureLoader: THREE.TextureLoader, group: string): Promise<SatelliteMesh[]> => {
    try {
      const satelliteData = await getSatelliteData(group);
      const satelliteMeshes: SatelliteMesh[] = [];
      const orbitLines: THREE.Line[] = [];
      
      satelliteData.forEach(satData => {
        if (!satData.NORAD_CAT_ID) return;
        
        // Calculate orbital parameters
        const semiMajorAxis = Math.pow(398600.4418 / (Math.pow(satData.MEAN_MOTION * 2 * Math.PI / 86400, 2)), 1/3) / EARTH_RADIUS;
        const inclination = satData.INCLINATION * (Math.PI / 180);
        const raan = satData.RA_OF_ASC_NODE * (Math.PI / 180);
        const argPerigee = satData.ARG_OF_PERICENTER * (Math.PI / 180);
        const meanAnomaly = satData.MEAN_ANOMALY * (Math.PI / 180);
        
        // Create satellite data object
        const satelliteData: SatelliteData = {
          name: satData.OBJECT_NAME,
          noradId: satData.NORAD_CAT_ID,
          orbit: {
            height: semiMajorAxis * (1 - satData.ECCENTRICITY) - 1,
            inclination: inclination,
            phase: meanAnomaly
          },
          position: {
            latitude: Math.asin(Math.sin(meanAnomaly) * Math.sin(inclination)) * (180 / Math.PI),
            longitude: Math.atan2(
              Math.sin(meanAnomaly) * Math.cos(inclination),
              Math.cos(meanAnomaly)
            ) * (180 / Math.PI)
          },
          rawData: satData
        };
        
        // Create and add the satellite mesh
        const satMesh = createSatelliteMesh(scene, textureLoader, satelliteData);
        
        // Create orbit line for this satellite
        const orbitPoints = createOrbitLine(satelliteData);
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthTest: true,
          depthWrite: true,
          linewidth: 2
        });
        
        const orbitLine = new THREE.Line(lineGeometry, lineMaterial);
        orbitLine.renderOrder = 1;
        orbitLine.position.set(0, 0, 0);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
        
        // Calculate initial position
        const radius = GLOBE_RADIUS * (1 + satelliteData.orbit.height);
        const x = Math.cos(meanAnomaly) * radius;
        const y = Math.sin(meanAnomaly) * radius * Math.sin(inclination);
        const z = Math.sin(meanAnomaly) * radius * Math.cos(inclination);
        
        const position = new THREE.Vector3(x, y, z);
        position.applyAxisAngle(new THREE.Vector3(0, 1, 0), argPerigee);
        position.applyAxisAngle(new THREE.Vector3(0, 0, 1), raan);
        
        satMesh.mesh.position.copy(position);
        satelliteMeshes.push(satMesh);
      });
      
      // Store the satellite meshes and orbit lines in refs
      satelliteMeshesRef.current = satelliteMeshes;
      orbitLinesRef.current = orbitLines;
      
      setSatellites(satelliteMeshes.map(sat => sat.data));
      
      return satelliteMeshes;
    } catch (error) {
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

  // Function to create orbit line
  const createOrbitLine = (satelliteData: SatelliteData) => {
    const points: THREE.Vector3[] = [];
    const segments = 200;
    const radius = GLOBE_RADIUS * (1 + satelliteData.orbit.height);
    const inclination = satelliteData.orbit.inclination;
    const raan = satelliteData.rawData.RA_OF_ASC_NODE * (Math.PI / 180);
    const argPerigee = satelliteData.rawData.ARG_OF_PERICENTER * (Math.PI / 180);

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      
      // Start with a point in the xy-plane
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = 0;

      const point = new THREE.Vector3(x, y, z);
      
      // Apply rotations in the correct order:
      // 1. Inclination (rotate around x-axis)
      point.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
      
      // 2. Argument of perigee (rotate around z-axis)
      point.applyAxisAngle(new THREE.Vector3(0, 0, 1), argPerigee);
      
      // 3. RAAN (rotate around z-axis)
      point.applyAxisAngle(new THREE.Vector3(0, 0, 1), raan);
      
      points.push(point);
    }

    // Add first point again to close the loop
    points.push(points[0].clone());

    return points;
  };

  const handleSatelliteClick = (satellite: SatelliteData) => {
    // Find the satellite mesh
    const satelliteMesh = satelliteMeshesRef.current.find(
      sat => sat.data.noradId === satellite.noradId
    );

    if (satelliteMesh && camera && controls) {
      // Get the satellite's position
      const satellitePosition = new THREE.Vector3();
      satelliteMesh.mesh.getWorldPosition(satellitePosition);

      // Calculate the target camera position
      const distance = 8;
      const direction = satellitePosition.clone().normalize();
      const targetPosition = satellitePosition.clone().add(direction.multiplyScalar(distance));

      // Disable controls during animation
      controls.enabled = false;

      // Store initial camera position and target
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      const endTarget = satellitePosition;

      // Animation duration in milliseconds
      const duration = 1000;
      const startTime = Date.now();

      // Hide all orbit lines first
      orbitLinesRef.current.forEach(line => {
        if (line.material instanceof THREE.LineBasicMaterial) {
          line.material.opacity = 0;
        }
      });

      // Show the clicked satellite's orbit line
      const clickedIndex = satelliteMeshesRef.current.findIndex(sat => sat.data.noradId === satellite.noradId);
      if (clickedIndex !== -1 && orbitLinesRef.current[clickedIndex]) {
        const lineMaterial = orbitLinesRef.current[clickedIndex].material as THREE.LineBasicMaterial;
        lineMaterial.opacity = 1;
      }

      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease function (cubic ease-out)
        const ease = 1 - Math.pow(1 - progress, 3);

        // Interpolate camera position
        camera.position.lerpVectors(startPosition, targetPosition, ease);

        // Interpolate control target
        controls.target.lerpVectors(startTarget, endTarget, ease);
        controls.update();

        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        } else {
          // Re-enable controls after animation
          controls.enabled = true;
        }
      };

      animateCamera();
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <CurrentlyViewing 
          selectedGroup={activeGroup} 
          satellites={satellites}
          onSatelliteClick={handleSatelliteClick}
        />
      </div>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <SatelliteMenu onGroupSelect={handleGroupSelect} />
      </div>
      
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
      {/* <SidePanel satellites={satellites} /> */}
    </div>
  );
};

export default Globe;
