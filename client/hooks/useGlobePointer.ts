import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MOUSE_THROTTLE_MS } from '@/lib/globe/orbitMath';
import type { SatelliteData } from '@/services/types';
import type { SatellitePointData, TooltipState, PopupState } from '@/lib/globe/types';
import { updatePointColors as updatePointColorsUtil } from '@/lib/globe/threeUtils';

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
  onSatelliteSelectRef: React.MutableRefObject<((satellite: SatelliteData) => void) | null>
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
      lastMouseEventRef,
      mouseThrottleTimeoutRef,
      lastMouseRunRef,
      onMouseMoveRef,
      handleClickRef,
    } = refs;
    const { setSelectedSatellite } = setters;

    raycasterRef.current = new THREE.Raycaster();
    // Tighter threshold so we only hit points under the cursor (default 1 is large vs point size)
    raycasterRef.current.params.Points!.threshold = 0.25;
    mouseRef.current = new THREE.Vector2();
    handlersRef.current = { scene, camera, renderer, controls };

    const runMouseMoveLogic = (event: MouseEvent) => {
      if (!containerRef.current || !camera || !raycasterRef.current || !mouseRef.current) return;
      const points = satellitePointsRef.current;
      if (!points) return;

      const canvasEl = (event.currentTarget ?? renderer.domElement) as HTMLElement;
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Use drawing buffer size so NDC matches the actual viewport (handles devicePixelRatio)
      const ctx = renderer.getContext();
      const bufferW = ctx.drawingBufferWidth;
      const bufferH = ctx.drawingBufferHeight;
      if (bufferW === 0 || bufferH === 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * bufferW;
      const y = ((event.clientY - rect.top) / rect.height) * bufferH;
      mouseRef.current.x = (x / bufferW) * 2 - 1;
      mouseRef.current.y = -(y / bufferH) * 2 + 1;

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

      const canvasEl = (event.currentTarget ?? renderer.domElement) as HTMLElement;
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const ctx = renderer.getContext();
      const bufferW = ctx.drawingBufferWidth;
      const bufferH = ctx.drawingBufferHeight;
      if (bufferW === 0 || bufferH === 0) return;
      const px = ((event.clientX - rect.left) / rect.width) * bufferW;
      const py = ((event.clientY - rect.top) / rect.height) * bufferH;
      const x = (px / bufferW) * 2 - 1;
      const y = -(py / bufferH) * 2 + 1;
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
          onSatelliteSelectRef.current?.(pointData.data);
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
