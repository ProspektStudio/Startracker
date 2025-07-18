'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import getSatelliteData from '@/services/satelliteData';
import { SatelliteData } from '@/services/types';
import FPSCounter from './FPSCounter';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import useClientStore from '@/hooks/useClientStore';

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

interface PopupState {
  visible: boolean;
  data: SatelliteData | null;
  x: number;
  y: number;
}

const Globe: React.FC = () => {

  const {
    selectedGroup,
    satellites,
    selectedSatellite,
    setSatellites,
    setSelectedSatellite
  } = useClientStore();

  // State
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
  const [popup, setPopup] = useState<PopupState>({ visible: false, data: null, x: 0, y: 0 });
  const [fps, setFps] = useState<number>(0);
  const [activeOrbit, setActiveOrbit] = useState<THREE.Mesh | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const satelliteMeshesRef = useRef<SatelliteMesh[]>([]);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const initialCameraPosition = useRef<THREE.Vector3 | null>(null);
  const initialControlsTarget = useRef<THREE.Vector3 | null>(null);
  const onMouseMoveRef = useRef<((event: MouseEvent) => void) | null>(null);
  const handleClickRef = useRef<((event: MouseEvent) => void) | null>(null);
  const orbitLinesRef = useRef<THREE.Mesh[]>([]);
  const selectedSatelliteRef = useRef<SatelliteData | null>(null);

  // Constants
  const GLOBE_RADIUS = 5;
  const SATELLITE_SIZE = 0.15;
  const ORBIT_SPEED = 0.000001;
  const DEFAULT_COLOR = 0xFFFFFF;
  const HIGHLIGHT_COLOR = 0x00F900;
  const SELECTED_COLOR = 0x00FF00;

  // Cold start the api server
  useQuery({
    queryKey: ['hello'],
    queryFn: apiClient.hello
  });

  // Update the ref whenever selectedSatellite changes
  useEffect(() => {
    selectedSatelliteRef.current = selectedSatellite;
  }, [selectedSatellite]);

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

    // Ensure container is mounted and has dimensions
    if (!containerRef.current || containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
      console.warn('Container not ready for WebGLRenderer initialization');
      return;
    }

    const newRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
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

      // Reset all non-selected satellites to white first

      satelliteMeshesRef.current.forEach(sat => {
        if (sat.material.color.getHex() === HIGHLIGHT_COLOR && sat.data.noradId !== selectedSatelliteRef.current?.noradId) {
          sat.material.color.setHex(DEFAULT_COLOR);
        }
      });

      if (intersects.length > 0) {
        const satelliteMesh = intersects[0].object;
        const satelliteData = satelliteMeshesRef.current.find(sat => sat.mesh === satelliteMesh);

        if (satelliteData && satelliteData.data.noradId !== selectedSatelliteRef.current?.noradId) {
          satelliteData.material.color.setHex(HIGHLIGHT_COLOR);
          
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
          setSelectedSatellite(satelliteData.data);

          // Hide all orbit lines first
          orbitLinesRef.current.forEach(line => {
            if (line.material instanceof THREE.MeshBasicMaterial) {
              line.material.opacity = 0;
              line.material.color.setHex(HIGHLIGHT_COLOR);
            }
          });

          // Show only the clicked satellite's orbit line
          const clickedIndex = satelliteMeshesRef.current.findIndex(sat => sat.mesh === clickedSprite);
          if (clickedIndex !== -1 && orbitLinesRef.current[clickedIndex]) {
            const lineMaterial = orbitLinesRef.current[clickedIndex].material as THREE.MeshBasicMaterial;
            lineMaterial.opacity = 0.8;
            lineMaterial.color.setHex(HIGHLIGHT_COLOR);
          }

          // Get the satellite's position for camera movement
          const satellitePosition = new THREE.Vector3();
          clickedSprite.getWorldPosition(satellitePosition);

          // Create orbit line
          const orbitLine = createOrbitLine(satelliteData.data);
          
          // Position the line at the Earth's center (0,0,0)
          orbitLine.position.set(0, 0, 0);
          
          // Scale the line to make it more visible
          orbitLine.scale.set(1.1, 1.1, 1.1);
          
          // Remove any existing orbit line first
          if (activeOrbit && scene) {
            scene.remove(activeOrbit);
          }
          
          // Add the new line to the scene
          if (scene) {
            scene.add(orbitLine);
          }
          
          // Store the new orbit line
          setActiveOrbit(orbitLine);

          // Change color to green instead of white
          const selectedMaterial = new THREE.SpriteMaterial({
            map: clickedSprite.material.map,
            color: SELECTED_COLOR,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1,
            blending: THREE.NormalBlending
          });

          // Clear all other instances of SELECTED_COLOR first
          satelliteMeshesRef.current.forEach(sat => {
            if (sat.material.color.getHex() === SELECTED_COLOR) {
              sat.material.color.setHex(DEFAULT_COLOR);
            }
          });

          clickedSprite.material = selectedMaterial;
          satelliteData.material = selectedMaterial;

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
              }
            };

            animateCamera();
          }
        }
      }
    };

    // Store event handlers in refs
    onMouseMoveRef.current = onMouseMove;
    handleClickRef.current = handleClick;

    // Create satellites
    createSatellites(newScene, textureLoader)
      .then(() => {
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

      // Update orbit line width based on camera distance
      if (camera && activeOrbit) {
        const cameraDistance = camera.position.length();
        // Scale the line width with distance
        const baseScale = 1;
        const scaleFactor = cameraDistance / 12; // 12 is the initial camera distance
        const newScale = baseScale * scaleFactor;
        activeOrbit.scale.setScalar(newScale);
      }

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

    // Hide the popup immediately
    setTimeout(() => {
      setPopup({ visible: false, data: null, x: 0, y: 0 });
    }, 0); // Match the transition duration

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
      const newSatelliteMeshes = await createSatellites(scene, textureLoader);
      satelliteMeshesRef.current = newSatelliteMeshes;
    }
  };

  useEffect(() => {
    handleGroupSelect(selectedGroup);
  }, [selectedGroup]);

  const createSatellites = async (scene: THREE.Scene, textureLoader: THREE.TextureLoader): Promise<SatelliteMesh[]> => {
    try {
      const satelliteData = await getSatelliteData(selectedGroup);
      const satelliteMeshes: SatelliteMesh[] = [];
      const orbitLines: THREE.Mesh[] = [];
      
      satelliteData.forEach(satData => {
        const rawData = satData.rawData;
        if (!rawData.NORAD_CAT_ID) return;
        
        // Create and add the satellite mesh
        const satMesh = createSatelliteMesh(scene, textureLoader, satData);
        
        // Create orbit line for this satellite
        const orbitLine = createOrbitLine(satData);
        orbitLine.renderOrder = 1;
        orbitLine.position.set(0, 0, 0);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);
        
        // Calculate initial position
        const radius = GLOBE_RADIUS * (1 + satData.orbit.height);
        const x = Math.cos(satData.orbit.phase) * radius;
        const y = Math.sin(satData.orbit.phase) * radius * Math.sin(satData.orbit.inclination);
        const z = Math.sin(satData.orbit.phase) * radius * Math.cos(satData.orbit.inclination);
        
        const position = new THREE.Vector3(x, y, z);
        position.applyAxisAngle(new THREE.Vector3(0, 1, 0), satData.orbit.argPerigee);
        position.applyAxisAngle(new THREE.Vector3(0, 0, 1), satData.orbit.raan);
        
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
      color: DEFAULT_COLOR,
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
      sat.material.color.setHex(DEFAULT_COLOR);
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

    // Create a curve from the points
    const curve = new THREE.CatmullRomCurve3(points);
    
    // Create tube geometry
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      segments,
      0.02,
      16,
      false
    );
    
    // Create material for the tube
    const material = new THREE.MeshBasicMaterial({
      color: HIGHLIGHT_COLOR, // Green color
      transparent: true,
      opacity: 0, // Start invisible
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    
    const tubeMesh = new THREE.Mesh(tubeGeometry, material);
    tubeMesh.renderOrder = 1;
    
    return tubeMesh;
  };

  const handleSatelliteSelect = (satellite: SatelliteData) => {
    // Hide popup and tooltip immediately when selection starts
    setPopup({ visible: false, data: null, x: 0, y: 0 });
    setTooltip({ visible: false, text: '', x: 0, y: 0 });
    
    // Find the satellite mesh
    const satelliteMesh = satelliteMeshesRef.current.find(
      sat => sat.data.noradId === satellite.noradId
    );

    if (satelliteMesh && camera && controls) {
      // Hide all orbit lines first
      orbitLinesRef.current.forEach(line => {
        if (line.material instanceof THREE.MeshBasicMaterial) {
          line.material.opacity = 0;
          line.material.color.setHex(HIGHLIGHT_COLOR);
        }
      });

      // Show only the clicked satellite's orbit line
      const clickedIndex = satelliteMeshesRef.current.findIndex(sat => sat.data.noradId === satellite.noradId);
      if (clickedIndex !== -1 && orbitLinesRef.current[clickedIndex]) {
        const lineMaterial = orbitLinesRef.current[clickedIndex].material as THREE.MeshBasicMaterial;
        lineMaterial.opacity = 0.8;
        lineMaterial.color.setHex(HIGHLIGHT_COLOR);
      }

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
      const duration = 2000;
      const startTime = Date.now();

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

          // Show popup after camera animation
          const screenPosition = satellitePosition.clone().project(camera);
          
          // Check if satellite is behind the globe (z > 1)
          if (screenPosition.z > 1) {
            return;
          }
          
          const rect = renderer?.domElement.getBoundingClientRect();
          if (!rect) return;
          
          // Position popup at bottom right of satellite dot with 1px spacing
          const dotSize = SATELLITE_SIZE * 100; // Convert to pixels
          let x = ((screenPosition.x * 0.5 + 0.5) * rect.width) + rect.left;
          let y = (-(screenPosition.y * 0.5 - 0.5) * rect.height) + rect.top;
          
          // Ensure popup stays within viewport
          const popupWidth = 305;
          const popupHeight = 174;
          const padding = 10;
          
          // Adjust x position if popup would go off the right edge
          if (x + popupWidth > rect.right - padding) {
            x = x - popupWidth - dotSize - 1; // Position to the left of the dot
          } else {
            x = x + dotSize + 1; // Position to the right of the dot
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
          
          // Update popup position and show it
          setPopup({
            visible: true,
            data: satellite,
            x,
            y
          });
        }
      };

      animateCamera();
    }
  };

  useEffect(() => {
    if (selectedSatellite) {
      handleSatelliteSelect(selectedSatellite);
    }
  }, [selectedSatellite]);

  useEffect(() => {
    setTimeout(() => {
      if (satellites.length > 0 && !selectedSatellite) {
        setSelectedSatellite(satellites[0]);
      }
    }, 0);
  }, [satellites, selectedSatellite]);

  return (
    <div ref={containerRef} style={{ height: '100%' }} className="flex-1">

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 1000,
      }}>
        {/* TODO: Fix Center Earth Button */}
        {/* <button
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
        </button> */}

        {/* FPS Counter */}
        <FPSCounter fps={fps} />
      </div>

      {tooltip.visible && (
        <Tooltip text={tooltip.text} x={tooltip.x} y={tooltip.y} />
      )}
      
      {popup.data && (
        <Tooltip text={popup.data.name} x={popup.x} y={popup.y} selectedTooltip={true} />
      )}
    </div>
  );
};

const Tooltip = ({ text, x, y, selectedTooltip }: { text: string, x: number, y: number, selectedTooltip?: boolean }) => {
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
        transform: selectedTooltip ? '0' : 'translate(-50%, -100%)'
      }}
    >
      {text}
    </div>
  );
};

export default Globe;
