import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GREEN_R, GREEN_G, GREEN_B, WHITE_R, WHITE_G, WHITE_B } from './orbitMath';

/**
 * Animate camera to fly to a position looking at a target (e.g. satellite).
 * Uses cubic ease-out. Disables controls during animation.
 */
export function flyToCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPosition: THREE.Vector3,
  distance: number,
  durationMs: number,
  onComplete?: () => void
): void {
  const direction = targetPosition.clone().normalize();
  const cameraPosition = targetPosition.clone().add(direction.multiplyScalar(distance));
  const startPosition = camera.position.clone();
  const startTarget = controls.target.clone();

  controls.enabled = false;
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(startPosition, cameraPosition, ease);
    controls.target.lerpVectors(startTarget, targetPosition, ease);
    controls.update();
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      controls.enabled = true;
      onComplete?.();
    }
  };
  animate();
}

let circlePointTexture: THREE.CanvasTexture | null = null;

/**
 * Circular texture for round point sprites (created once in browser, shared).
 */
export function getCirclePointTexture(): THREE.CanvasTexture | null {
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

export interface PointColors {
  whiteR: number;
  whiteG: number;
  whiteB: number;
  greenR: number;
  greenG: number;
  greenB: number;
}

const DEFAULT_POINT_COLORS: PointColors = {
  whiteR: WHITE_R,
  whiteG: WHITE_G,
  whiteB: WHITE_B,
  greenR: GREEN_R,
  greenG: GREEN_G,
  greenB: GREEN_B,
};

/**
 * Update point colors in the Points buffer (selected and hovered indices).
 */
export function updatePointColors(
  points: THREE.Points | null,
  selectedIndex: number | null,
  hoveredIndex: number | null,
  colors: Partial<PointColors> = {}
): void {
  if (!points?.geometry?.attributes?.color) return;
  const arr = points.geometry.attributes.color.array as Float32Array;
  const n = points.geometry.attributes.position.count;
  const { whiteR, whiteG, whiteB, greenR, greenG, greenB } = {
    ...DEFAULT_POINT_COLORS,
    ...colors,
  };
  for (let i = 0; i < n; i++) {
    if (i === selectedIndex || i === hoveredIndex) {
      arr[i * 3] = greenR;
      arr[i * 3 + 1] = greenG;
      arr[i * 3 + 2] = greenB;
    } else {
      arr[i * 3] = whiteR;
      arr[i * 3 + 1] = whiteG;
      arr[i * 3 + 2] = whiteB;
    }
  }
  points.geometry.attributes.color.needsUpdate = true;
}
