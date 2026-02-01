'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import getSatelliteData from '@/services/satelliteData';
import { SatelliteData } from '@/services/types';
import FPSCounter from './FPSCounter';
import Tooltip from './Tooltip';
import useClientStore from '@/hooks/useClientStore';
import { useGlobeScene } from '@/hooks/useGlobeScene';
import { useGlobeAnimation } from '@/hooks/useGlobeAnimation';
import { useGlobePointer } from '@/hooks/useGlobePointer';
import type { SatellitePointData } from '@/lib/globe/types';
import {
  SATELLITE_SIZE,
  HIGHLIGHT_COLOR,
  WHITE_R,
  WHITE_G,
  WHITE_B,
  getPositionAtPhase,
  getOrbitLinePoints,
} from '@/lib/globe/orbitMath';
import { getCirclePointTexture, updatePointColors as updatePointColorsUtil, flyToCamera } from '@/lib/globe/threeUtils';

const Globe: React.FC = () => {

  const {
    selectedGroup,
    selectedSatellite,
    setSatellites,
    setSelectedSatellite
  } = useClientStore();

  // State
  const [, setActiveOrbit] = useState<THREE.Mesh | null>(null);

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
  const attachedPointerListenersRef = useRef<{
    onMouseMove: (e: MouseEvent) => void;
    handleClick: (e: MouseEvent) => void;
  } | null>(null);
  const onSatelliteSelectRef = useRef<((satellite: SatelliteData) => void) | null>(null);

  const { scene, camera, renderer, controls } = useGlobeScene(containerRef, {
    initialCameraPositionRef: initialCameraPosition,
    initialControlsTargetRef: initialControlsTarget,
    cameraRef,
  });

  useGlobeAnimation(scene, camera, renderer, controls, {
    animationRef,
    cameraRef,
    satellitePointsRef,
    satelliteDataRef,
    activeOrbitRef,
    orbitPositionVecRef,
    fpsRef,
    frameTimesRef,
    lastFrameTimeRef,
  });

  const createOrbitLine = useCallback((satelliteData: SatelliteData) => {
    const segments = 200;
    const points = getOrbitLinePoints(satelliteData, segments);
    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.02, 16, false);
    const material = new THREE.MeshBasicMaterial({
      color: HIGHLIGHT_COLOR,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const tubeMesh = new THREE.Mesh(tubeGeometry, material);
    tubeMesh.renderOrder = 1;
    return tubeMesh;
  }, []);

  const { tooltip, popup, setTooltip, setPopup } = useGlobePointer(
    scene,
    camera,
    renderer,
    controls,
    {
      containerRef,
      raycasterRef,
      mouseRef,
      satellitePointsRef,
      satelliteDataRef,
      selectedSatelliteRef,
      selectedPointIndexRef,
      hoveredPointIndexRef,
      activeOrbitRef,
      lastMouseEventRef,
      mouseThrottleTimeoutRef,
      lastMouseRunRef,
      onMouseMoveRef,
      handleClickRef,
    },
    { setSelectedSatellite, setActiveOrbit },
    onSatelliteSelectRef
  );

  selectedSatelliteRef.current = selectedSatellite;

  const handleSatelliteSelect = useCallback((satellite: SatelliteData) => {
    setPopup({ visible: false, data: null, x: 0, y: 0 });
    setTooltip({ visible: false, text: '', x: 0, y: 0 });

    const clickedIndex = satelliteDataRef.current.findIndex(
      (sat) => sat.data.noradId === satellite.noradId
    );
    const points = satellitePointsRef.current;
    if (clickedIndex === -1 || !points || !scene || !camera || !controls) return;

    selectedPointIndexRef.current = clickedIndex;
    updatePointColorsUtil(points, clickedIndex, null);

    if (activeOrbitRef.current && scene) {
      scene.remove(activeOrbitRef.current);
      activeOrbitRef.current = null;
    }
    const orbitLine = createOrbitLine(satellite);
    orbitLine.position.set(0, 0, 0);
    const lineMaterial = orbitLine.material as THREE.MeshBasicMaterial;
    lineMaterial.opacity = 0.8;
    lineMaterial.color.setHex(HIGHLIGHT_COLOR);
    scene.add(orbitLine);
    setActiveOrbit(orbitLine);
    activeOrbitRef.current = orbitLine;

    const posAttr = points.geometry.attributes.position;
    const satellitePosition = new THREE.Vector3(
      posAttr.getX(clickedIndex),
      posAttr.getY(clickedIndex),
      posAttr.getZ(clickedIndex)
    );

    flyToCamera(camera, controls, satellitePosition, 8, 2000, () => {
      const screenPosition = satellitePosition.clone().project(camera);
      if (screenPosition.z > 1) return;
      const rect = renderer?.domElement.getBoundingClientRect();
      if (!rect) return;
      const dotSize = SATELLITE_SIZE * 100;
      let x = (screenPosition.x * 0.5 + 0.5) * rect.width + rect.left;
      let y = (-(screenPosition.y * 0.5 - 0.5) * rect.height) + rect.top;
      const popupWidth = 305;
      const popupHeight = 174;
      const padding = 10;
      if (x + popupWidth > rect.right - padding) {
        x = x - popupWidth - dotSize - 1;
      } else {
        x = x + dotSize + 1;
      }
      if (x < rect.left + padding) x = rect.left + padding;
      if (y + popupHeight > rect.bottom - padding) y = rect.bottom - popupHeight - padding;
      if (y < rect.top + padding) y = rect.top + padding;
      setPopup({ visible: true, data: satellite, x, y });
    });
  }, [scene, camera, controls, renderer, setPopup, setTooltip, setActiveOrbit]);

  onSatelliteSelectRef.current = handleSatelliteSelect;

  // Setup Three.js scene
  useEffect(() => {
    if (!scene || !camera || !renderer || !controls) return;

    const newScene = scene;
    const newRenderer = renderer;

    orbitPositionVecRef.current = new THREE.Vector3();
    orbitAxisXRef.current = new THREE.Vector3(1, 0, 0);
    orbitAxisZRef.current = new THREE.Vector3(0, 0, 1);

    // Attach pointer listeners only. Satellites are created by the selectedGroup effect (handleGroupSelect)
    // so we don't call createSatellites here and avoid rendering two Points objects (one hoverable, one not).
    const onMouseMove = onMouseMoveRef.current;
    const handleClick = handleClickRef.current;
    if (onMouseMove && handleClick) {
      attachedPointerListenersRef.current = { onMouseMove, handleClick };
      newRenderer.domElement.addEventListener('mousemove', onMouseMove);
      newRenderer.domElement.addEventListener('click', handleClick);
    }

    // Cleanup
    return () => {
      if (mouseThrottleTimeoutRef.current) {
        clearTimeout(mouseThrottleTimeoutRef.current);
        mouseThrottleTimeoutRef.current = null;
      }
      const attached = attachedPointerListenersRef.current;
      if (newRenderer.domElement && attached) {
        newRenderer.domElement.removeEventListener('mousemove', attached.onMouseMove);
        newRenderer.domElement.removeEventListener('click', attached.handleClick);
        attachedPointerListenersRef.current = null;
      }

      // Remove orbit lines and satellite points
      if (satellitePointsRef.current && newScene) {
        newScene.remove(satellitePointsRef.current);
        satellitePointsRef.current = null;
      }
      satelliteDataRef.current = [];
      activeOrbitRef.current = null;
    };
  }, [scene, camera, renderer, controls]);

  const createSatellites = useCallback(async (scene: THREE.Scene): Promise<void> => {
    try {
      const satelliteData = await getSatelliteData(selectedGroup);
      const dataWithPhase: SatellitePointData[] = [];
      const positions: number[] = [];
      const colors: number[] = [];

      satelliteData.forEach((satData) => {
        const rawData = satData.rawData;
        if (!rawData.NORAD_CAT_ID) return;

        dataWithPhase.push({ data: satData, phase: satData.orbit.phase });

        const pos = getPositionAtPhase(
          satData.orbit.phase,
          satData.orbit.height,
          satData.orbit.inclination,
          satData.rawData.ARG_OF_PERICENTER * (Math.PI / 180),
          satData.rawData.RA_OF_ASC_NODE * (Math.PI / 180)
        );
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
      selectedPointIndexRef.current = null;
      hoveredPointIndexRef.current = null;
      setSatellites(dataWithPhase.map((d) => d.data));
      if (dataWithPhase.length > 0) {
        const first = dataWithPhase[0].data;
        setSelectedSatellite(first);
        handleSatelliteSelect(first);
      }
    } catch (error) {
      satellitePointsRef.current = null;
      satelliteDataRef.current = [];
    }
  }, [selectedGroup, setSelectedSatellite, handleSatelliteSelect]);

  const handleGroupSelect = useCallback(async () => {
    setTimeout(() => {
      setPopup({ visible: false, data: null, x: 0, y: 0 });
    }, 0);

    if (scene) {
      if (activeOrbitRef.current) {
        scene.remove(activeOrbitRef.current);
        activeOrbitRef.current = null;
      }
    }

    if (scene && satellitePointsRef.current) {
      scene.remove(satellitePointsRef.current);
      satellitePointsRef.current = null;
    }
    satelliteDataRef.current = [];

    if (scene) {
      await createSatellites(scene);
    }
  }, [scene, createSatellites, setPopup]);

  useEffect(() => {
    handleGroupSelect();
  }, [selectedGroup, handleGroupSelect]);

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

export default Globe;
