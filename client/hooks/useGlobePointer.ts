import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HIGHLIGHT_COLOR, MOUSE_THROTTLE_MS } from '@/lib/globe/orbitMath';
import type { SatelliteData } from '@/services/types';
import type { SatellitePointData, TooltipState, PopupState } from '@/lib/globe/types';
import { updatePointColors as updatePointColorsUtil, flyToCamera } from '@/lib/globe/threeUtils';

export interface UseGlobePointerRefs {
  containerRef: React.RefObject<HTMLDivElement | null>;
  raycasterRef: React.MutableRefObject<THREE.Raycaster | null>;
  mouseRef: React.MutableRefObject<THREE.Vector2 | null>;
  satellitePointsRef: React.MutableRefObject<THREE.Points | null>;
  satelliteDataRef: React.MutableRefObject<SatellitePointData[]>;
  selectedSatelliteRef: React.MutableRefObject<SatelliteData | null>;
  selectedPointIndexRef: React.MutableRefObject<number | null>;
  hoveredPointIndexRef: React.MutableRefObject<number | null>;
  activeOrbitRef: React.MutableRefObject<THREE.Mesh | null>;
  lastMouseEventRef: React.MutableRefObject<MouseEvent | null>;
  mouseThrottleTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastMouseRunRef: React.MutableRefObject<number>;
  onMouseMoveRef: React.MutableRefObject<((e: MouseEvent) => void) | null>;
  handleClickRef: React.MutableRefObject<((e: MouseEvent) => void) | null>;
}

export interface UseGlobePointerSetters {
  setSelectedSatellite: (satellite: SatelliteData | null) => void;
  setActiveOrbit: (mesh: THREE.Mesh | null) => void;
}

export function useGlobePointer(
  scene: THREE.Scene | null,
  camera: THREE.PerspectiveCamera | null,
  renderer: THREE.WebGLRenderer | null,
  controls: OrbitControls | null,
  refs: UseGlobePointerRefs,
  setters: UseGlobePointerSetters,
  createOrbitLine: (satelliteData: SatelliteData) => THREE.Mesh
) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
  const [popup, setPopup] = useState<PopupState>({ visible: false, data: null, x: 0, y: 0 });
  const handlersRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
  } | null>(null);

  useEffect(() => {
    if (!scene || !camera || !renderer || !controls) return;

    const {
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
    } = refs;
    const { setSelectedSatellite, setActiveOrbit } = setters;

    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();
    handlersRef.current = { scene, camera, renderer, controls };

    const runMouseMoveLogic = (event: MouseEvent) => {
      if (!containerRef.current || !camera || !raycasterRef.current || !mouseRef.current) return;
      const points = satellitePointsRef.current;
      if (!points) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(points);

      if (intersects.length > 0) {
        const index = intersects[0].index ?? 0;
        const pointData = satelliteDataRef.current[index];
        if (pointData && pointData.data.noradId !== selectedSatelliteRef.current?.noradId) {
          hoveredPointIndexRef.current = index;
          updatePointColorsUtil(points, selectedPointIndexRef.current, index);
          setTooltip({
            visible: true,
            text: pointData.data.name,
            x: event.clientX,
            y: event.clientY - 10,
          });
        } else {
          hoveredPointIndexRef.current = null;
          updatePointColorsUtil(points, selectedPointIndexRef.current, null);
          setTooltip({ visible: false, text: '', x: 0, y: 0 });
        }
      } else {
        hoveredPointIndexRef.current = null;
        updatePointColorsUtil(points, selectedPointIndexRef.current, null);
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
      if (!raycasterRef.current || !camera || !renderer || !controls) return;
      const points = satellitePointsRef.current;
      if (!points || !mouseRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      if (!isFinite(x) || !isFinite(y)) return;

      mouseRef.current.x = x;
      mouseRef.current.y = y;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(points);

      if (intersects.length > 0) {
        const index = intersects[0].index ?? 0;
        const pointData = satelliteDataRef.current[index];
        if (pointData) {
          setSelectedSatellite(pointData.data);
          selectedPointIndexRef.current = index;
          updatePointColorsUtil(points, index, null);

          if (activeOrbitRef.current && scene) {
            scene.remove(activeOrbitRef.current);
          }
          const orbitLine = createOrbitLine(pointData.data);
          orbitLine.position.set(0, 0, 0);
          orbitLine.scale.set(1.1, 1.1, 1.1);
          const lineMaterial = orbitLine.material as THREE.MeshBasicMaterial;
          lineMaterial.opacity = 0.8;
          lineMaterial.color.setHex(HIGHLIGHT_COLOR);
          scene.add(orbitLine);
          setActiveOrbit(orbitLine);
          activeOrbitRef.current = orbitLine;

          const posAttr = points.geometry.attributes.position;
          const satellitePosition = new THREE.Vector3(
            posAttr.getX(index),
            posAttr.getY(index),
            posAttr.getZ(index)
          );

          flyToCamera(camera, controls, satellitePosition, 8, 1000);
        }
      }
    };

    onMouseMoveRef.current = onMouseMove;
    handleClickRef.current = handleClick;

    return () => {
      handlersRef.current = null;
      raycasterRef.current = null;
      mouseRef.current = null;
      onMouseMoveRef.current = null;
      handleClickRef.current = null;
    };
  }, [scene, camera, renderer, controls]);

  return {
    tooltip,
    popup,
    setTooltip,
    setPopup,
  };
}

/**
 * Attach mousemove and click listeners to the renderer's dom element.
 * Call after createSatellites resolves. Returns cleanup.
 */
export function attachPointerListeners(
  domElement: HTMLElement,
  onMouseMove: (e: MouseEvent) => void,
  handleClick: (e: MouseEvent) => void
): () => void {
  domElement.addEventListener('mousemove', onMouseMove);
  domElement.addEventListener('click', handleClick);
  return () => {
    domElement.removeEventListener('mousemove', onMouseMove);
    domElement.removeEventListener('click', handleClick);
  };
}
