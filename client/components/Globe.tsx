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

interface SatellitePointData {
  data: SatelliteData;
  phase: number;
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

// Circular texture for round point sprites (created once in browser, shared)
let circlePointTexture: THREE.CanvasTexture | null = null;
function getCirclePointTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (circlePointTexture) return circlePointTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  circlePointTexture = new THREE.CanvasTexture(canvas);
  circlePointTexture.needsUpdate = true;
  return circlePointTexture;
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
  const [activeOrbit, setActiveOrbit] = useState<THREE.Mesh | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2 | null>(null);
  const satellitePointsRef = useRef<THREE.Points | null>(null);
  const satelliteDataRef = useRef<SatellitePointData[]>([]);
  const hoveredPointIndexRef = useRef<number | null>(null);
  const selectedPointIndexRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const initialCameraPosition = useRef<THREE.Vector3 | null>(null);
  const initialControlsTarget = useRef<THREE.Vector3 | null>(null);
  const onMouseMoveRef = useRef<((event: MouseEvent) => void) | null>(null);
  const handleClickRef = useRef<((event: MouseEvent) => void) | null>(null);
  const orbitLinesRef = useRef<THREE.Mesh[]>([]);
  const selectedSatelliteRef = useRef<SatelliteData | null>(null);
  const fpsRef = useRef<number>(0);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const activeOrbitRef = useRef<THREE.Mesh | null>(null);
  const orbitPositionVecRef = useRef<THREE.Vector3 | null>(null);
  const orbitAxisXRef = useRef<THREE.Vector3 | null>(null);
  const orbitAxisZRef = useRef<THREE.Vector3 | null>(null);
  const lastMouseEventRef = useRef<MouseEvent | null>(null);
  const mouseThrottleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMouseRunRef = useRef<number>(0);
  const MOUSE_THROTTLE_MS = 50;

  // Constants
  const GLOBE_RADIUS = 5;
  const SATELLITE_SIZE = 0.15;
  const ORBIT_SPEED = 0.000001;
  const DEFAULT_COLOR = 0xFFFFFF;
  const HIGHLIGHT_COLOR = 0x00F900;
  const SELECTED_COLOR = 0x00FF00;
  // RGB 0-1 for buffer attributes
  const WHITE_R = 1; const WHITE_G = 1; const WHITE_B = 1;
  const GREEN_R = 0; const GREEN_G = 1; const GREEN_B = 0;

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
    orbitPositionVecRef.current = new THREE.Vector3();
    orbitAxisXRef.current = new THREE.Vector3(1, 0, 0);
    orbitAxisZRef.current = new THREE.Vector3(0, 0, 1);

    // Store everything in state/refs
    setScene(newScene);
    setCamera(newCamera);
    cameraRef.current = newCamera;
    setRenderer(newRenderer);
    setControls(newControls);

    // Helper: update point colors in buffer (selected and hovered indices)
    const updatePointColors = (points: THREE.Points | null, selectedIndex: number | null, hoveredIndex: number | null) => {
      if (!points?.geometry?.attributes?.color) return;
      const arr = points.geometry.attributes.color.array as Float32Array;
      const n = points.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        if (i === selectedIndex || i === hoveredIndex) {
          arr[i * 3] = GREEN_R; arr[i * 3 + 1] = GREEN_G; arr[i * 3 + 2] = GREEN_B;
        } else {
          arr[i * 3] = WHITE_R; arr[i * 3 + 1] = WHITE_G; arr[i * 3 + 2] = WHITE_B;
        }
      }
      points.geometry.attributes.color.needsUpdate = true;
    };

    // Throttled mousemove: run logic at most every MOUSE_THROTTLE_MS with latest event
    const runMouseMoveLogic = (event: MouseEvent) => {
      if (!containerRef.current || !newCamera || !raycasterRef.current || !mouseRef.current) return;
      const points = satellitePointsRef.current;
      if (!points) return;

      const rect = newRenderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);
      const intersects = raycasterRef.current.intersectObject(points);

      if (intersects.length > 0) {
        const index = intersects[0].index ?? 0;
        const pointData = satelliteDataRef.current[index];
        if (pointData && pointData.data.noradId !== selectedSatelliteRef.current?.noradId) {
          hoveredPointIndexRef.current = index;
          updatePointColors(points, selectedPointIndexRef.current, index);
          setTooltip({
            visible: true,
            text: pointData.data.name,
            x: event.clientX,
            y: event.clientY - 10
          });
        } else {
          hoveredPointIndexRef.current = null;
          updatePointColors(points, selectedPointIndexRef.current, null);
          setTooltip({ visible: false, text: '', x: 0, y: 0 });
        }
      } else {
        hoveredPointIndexRef.current = null;
        updatePointColors(points, selectedPointIndexRef.current, null);
        setTooltip({ visible: false, text: '', x: 0, y: 0 });
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      lastMouseEventRef.current = event;
      const now = performance.now();
      const elapsed = now - lastMouseRunRef.current;
      if (elapsed >= MOUSE_THROTTLE_MS || lastMouseRunRef.current === 0) {
        lastMouseRunRef.current = now;
        if (mouseThrottleTimeoutRef.current) {
          clearTimeout(mouseThrottleTimeoutRef.current);
          mouseThrottleTimeoutRef.current = null;
        }
        runMouseMoveLogic(event);
      } else if (!mouseThrottleTimeoutRef.current) {
        mouseThrottleTimeoutRef.current = setTimeout(() => {
          mouseThrottleTimeoutRef.current = null;
          const ev = lastMouseEventRef.current;
          if (ev) {
            lastMouseRunRef.current = performance.now();
            runMouseMoveLogic(ev);
          }
        }, MOUSE_THROTTLE_MS - elapsed);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !newCamera || !newRenderer || !newControls) return;
      const points = satellitePointsRef.current;
      if (!points || !mouseRef.current) return;

      const rect = newRenderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (!isFinite(x) || !isFinite(y)) return;

      mouseRef.current.x = x;
      mouseRef.current.y = y;
      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);
      const intersects = raycasterRef.current.intersectObject(points);

      if (intersects.length > 0) {
        const index = intersects[0].index ?? 0;
        const pointData = satelliteDataRef.current[index];
        if (pointData) {
          setSelectedSatellite(pointData.data);
          selectedPointIndexRef.current = index;
          updatePointColors(points, index, null);

          // Hide all orbit lines first
          orbitLinesRef.current.forEach(line => {
            if (line.material instanceof THREE.MeshBasicMaterial) {
              line.material.opacity = 0;
              line.material.color.setHex(HIGHLIGHT_COLOR);
            }
          });
          if (orbitLinesRef.current[index]) {
            const lineMaterial = orbitLinesRef.current[index].material as THREE.MeshBasicMaterial;
            lineMaterial.opacity = 0.8;
            lineMaterial.color.setHex(HIGHLIGHT_COLOR);
          }

          // Get position from Points geometry (positions are in world space)
          const posAttr = points.geometry.attributes.position;
          const satellitePosition = new THREE.Vector3(
            posAttr.getX(index),
            posAttr.getY(index),
            posAttr.getZ(index)
          );

          const orbitLine = createOrbitLine(pointData.data);
          orbitLine.position.set(0, 0, 0);
          orbitLine.scale.set(1.1, 1.1, 1.1);
          if (activeOrbitRef.current && newScene) {
            newScene.remove(activeOrbitRef.current);
          }
          newScene.add(orbitLine);
          setActiveOrbit(orbitLine);
          activeOrbitRef.current = orbitLine;

          const distance = 8;
          const direction = satellitePosition.clone().normalize();
          const targetPosition = satellitePosition.clone().add(direction.multiplyScalar(distance));

          newControls.enabled = false;
          const startPosition = newCamera.position.clone();
          const startTarget = newControls.target.clone();
          const endTarget = satellitePosition;
          const duration = 1000;
          const startTime = Date.now();

          const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            newCamera.position.lerpVectors(startPosition, targetPosition, ease);
            newControls.target.lerpVectors(startTarget, endTarget, ease);
            newControls.update();
            if (progress < 1) {
              requestAnimationFrame(animateCamera);
            } else {
              newControls.enabled = true;
            }
          };
          animateCamera();
        }
      }
    };

    // Store event handlers in refs
    onMouseMoveRef.current = onMouseMove;
    handleClickRef.current = handleClick;

    // Create satellites (Points + orbit lines)
    createSatellites(newScene)
      .then(() => {
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
      fpsRef.current = currentFps;

      // Update orbit line width based on camera distance
      const cam = cameraRef.current;
      const activeOrb = activeOrbitRef.current;
      if (cam && activeOrb) {
        const cameraDistance = cam.position.length();
        // Scale the line width with distance
        const baseScale = 1;
        const scaleFactor = cameraDistance / 12; // 12 is the initial camera distance
        const newScale = baseScale * scaleFactor;
        activeOrb.scale.setScalar(newScale);
      }

      animationRef.current = requestAnimationFrame(animate);

      // Update satellite positions in Points buffer (reuse vectors to avoid GC)
      const points = satellitePointsRef.current;
      const pos = orbitPositionVecRef.current;
      const axisX = orbitAxisXRef.current;
      const axisZ = orbitAxisZRef.current;
      if (points?.geometry?.attributes?.position && pos && axisX && axisZ) {
        const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        const data = satelliteDataRef.current;
        for (let i = 0; i < data.length; i++) {
          const sat = data[i];
          const orbitalSpeed = ORBIT_SPEED * Math.pow(sat.data.orbit.height, -1.5);
          sat.phase = (sat.phase + orbitalSpeed) % (Math.PI * 2);
          const radius = GLOBE_RADIUS * (1 + sat.data.orbit.height);
          const inclination = sat.data.orbit.inclination;
          pos.set(Math.cos(sat.phase) * radius, Math.sin(sat.phase) * radius, 0);
          pos.applyAxisAngle(axisX, inclination);
          pos.applyAxisAngle(axisZ, sat.data.rawData.ARG_OF_PERICENTER * (Math.PI / 180));
          pos.applyAxisAngle(axisZ, sat.data.rawData.RA_OF_ASC_NODE * (Math.PI / 180));
          posArray[i * 3] = pos.x;
          posArray[i * 3 + 1] = pos.y;
          posArray[i * 3 + 2] = pos.z;
        }
        posAttr.needsUpdate = true;
      }
      
      if (newControls) newControls.update();
      if (newRenderer && newScene && newCamera) {
        newRenderer.render(newScene, newCamera);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (mouseThrottleTimeoutRef.current) {
        clearTimeout(mouseThrottleTimeoutRef.current);
        mouseThrottleTimeoutRef.current = null;
      }
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
      
      // Remove orbit lines and satellite points
      if (satellitePointsRef.current && newScene) {
        newScene.remove(satellitePointsRef.current);
        satellitePointsRef.current = null;
      }
      satelliteDataRef.current = [];
      orbitLinesRef.current.forEach(line => {
        if (newScene) newScene.remove(line);
      });
      orbitLinesRef.current = [];
      activeOrbitRef.current = null;
    };
  }, []);

  const handleGroupSelect = async (group: string) => {

    // Hide the popup immediately
    setTimeout(() => {
      setPopup({ visible: false, data: null, x: 0, y: 0 });
    }, 0); // Match the transition duration

    // Clear existing orbit lines
    if (scene) {
      if (activeOrbitRef.current) {
        scene.remove(activeOrbitRef.current);
        activeOrbitRef.current = null;
      }
      orbitLinesRef.current.forEach(line => {
        scene.remove(line);
      });
      orbitLinesRef.current = [];
    }

    // Clear existing satellite points from the scene
    if (scene && satellitePointsRef.current) {
      scene.remove(satellitePointsRef.current);
      satellitePointsRef.current = null;
    }
    satelliteDataRef.current = [];

    // Create new satellites for the selected group
    if (scene) {
      await createSatellites(scene);
    }
  };

  useEffect(() => {
    handleGroupSelect(selectedGroup);
  }, [selectedGroup]);

  const createSatellites = async (scene: THREE.Scene): Promise<void> => {
    try {
      const satelliteData = await getSatelliteData(selectedGroup);
      const dataWithPhase: SatellitePointData[] = [];
      const orbitLines: THREE.Mesh[] = [];
      const positions: number[] = [];
      const colors: number[] = [];

      satelliteData.forEach(satData => {
        const rawData = satData.rawData;
        if (!rawData.NORAD_CAT_ID) return;

        dataWithPhase.push({ data: satData, phase: satData.orbit.phase });

        // Orbit line per satellite
        const orbitLine = createOrbitLine(satData);
        orbitLine.renderOrder = 1;
        orbitLine.position.set(0, 0, 0);
        scene.add(orbitLine);
        orbitLines.push(orbitLine);

        // Initial position (same math as animation loop)
        const radius = GLOBE_RADIUS * (1 + satData.orbit.height);
        const inclination = satData.orbit.inclination;
        const x = Math.cos(satData.orbit.phase) * radius;
        const y = Math.sin(satData.orbit.phase) * radius;
        const z = 0;
        const pos = new THREE.Vector3(x, y, z);
        pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
        pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), satData.rawData.ARG_OF_PERICENTER * (Math.PI / 180));
        pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), satData.rawData.RA_OF_ASC_NODE * (Math.PI / 180));
        positions.push(pos.x, pos.y, pos.z);
        colors.push(WHITE_R, WHITE_G, WHITE_B);
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const circleTexture = getCirclePointTexture();
      const material = new THREE.PointsMaterial({
        size: SATELLITE_SIZE,
        sizeAttenuation: true,
        vertexColors: true,
        ...(circleTexture && {
          map: circleTexture,
          transparent: true,
          alphaTest: 0.01,
        }),
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      satellitePointsRef.current = points;
      satelliteDataRef.current = dataWithPhase;
      orbitLinesRef.current = orbitLines;
      selectedPointIndexRef.current = null;
      hoveredPointIndexRef.current = null;
      setSatellites(dataWithPhase.map(d => d.data));
    } catch (error) {
      satellitePointsRef.current = null;
      satelliteDataRef.current = [];
      orbitLinesRef.current = [];
    }
  };

  // Add reset camera function
  const resetCamera = () => {
    if (!camera || !controls || !initialCameraPosition.current || !initialControlsTarget.current) return;

    // Reset all point colors to white
    const points = satellitePointsRef.current;
    if (points?.geometry?.attributes?.color) {
      const arr = points.geometry.attributes.color.array as Float32Array;
      const n = points.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        arr[i * 3] = WHITE_R; arr[i * 3 + 1] = WHITE_G; arr[i * 3 + 2] = WHITE_B;
      }
      points.geometry.attributes.color.needsUpdate = true;
    }
    selectedPointIndexRef.current = null;

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
    setPopup({ visible: false, data: null, x: 0, y: 0 });
    setTooltip({ visible: false, text: '', x: 0, y: 0 });

    const clickedIndex = satelliteDataRef.current.findIndex(
      sat => sat.data.noradId === satellite.noradId
    );
    const points = satellitePointsRef.current;
    if (clickedIndex === -1 || !points || !camera || !controls) return;

    selectedPointIndexRef.current = clickedIndex;
    // Update point colors: selected green, rest white
    const colorAttr = points.geometry?.attributes?.color;
    if (colorAttr) {
      const arr = colorAttr.array as Float32Array;
      const n = points.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) {
        if (i === clickedIndex) {
          arr[i * 3] = GREEN_R; arr[i * 3 + 1] = GREEN_G; arr[i * 3 + 2] = GREEN_B;
        } else {
          arr[i * 3] = WHITE_R; arr[i * 3 + 1] = WHITE_G; arr[i * 3 + 2] = WHITE_B;
        }
      }
      colorAttr.needsUpdate = true;
    }

    // Hide all orbit lines first
    orbitLinesRef.current.forEach(line => {
      if (line.material instanceof THREE.MeshBasicMaterial) {
        line.material.opacity = 0;
        line.material.color.setHex(HIGHLIGHT_COLOR);
      }
    });
    if (orbitLinesRef.current[clickedIndex]) {
      const lineMaterial = orbitLinesRef.current[clickedIndex].material as THREE.MeshBasicMaterial;
      lineMaterial.opacity = 0.8;
      lineMaterial.color.setHex(HIGHLIGHT_COLOR);
    }

    // Get position from Points geometry
    const posAttr = points.geometry.attributes.position;
    const satellitePosition = new THREE.Vector3(
      posAttr.getX(clickedIndex),
      posAttr.getY(clickedIndex),
      posAttr.getZ(clickedIndex)
    );

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
        <FPSCounter fpsRef={fpsRef} />
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
