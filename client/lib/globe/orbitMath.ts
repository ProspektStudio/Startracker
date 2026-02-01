import * as THREE from 'three';
import type { SatelliteData } from '@/services/types';

// Constants (globe and orbit)
export const GLOBE_RADIUS = 5;
export const SATELLITE_SIZE = 0.15;
export const ORBIT_SPEED = 0.000001;
export const MOUSE_THROTTLE_MS = 50;

// Colors (hex)
export const DEFAULT_COLOR = 0xffffff;
export const HIGHLIGHT_COLOR = 0x00f900;
export const SELECTED_COLOR = 0x00ff00;

// RGB 0-1 for buffer attributes
export const WHITE_R = 1;
export const WHITE_G = 1;
export const WHITE_B = 1;
export const GREEN_R = 0;
export const GREEN_G = 1;
export const GREEN_B = 0;

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/**
 * Single source of truth for satellite position from orbital phase.
 * Same formula as animation loop and createSatellites initial positions.
 * Mutates and returns `out` if provided to avoid allocation.
 */
export function getPositionAtPhase(
  phase: number,
  height: number,
  inclination: number,
  argPerigeeRad: number,
  raanRad: number,
  out?: THREE.Vector3
): THREE.Vector3 {
  const radius = GLOBE_RADIUS * (1 + height);
  const v = out ?? new THREE.Vector3();
  v.set(Math.cos(phase) * radius, Math.sin(phase) * radius, 0);
  v.applyAxisAngle(AXIS_X, inclination);
  v.applyAxisAngle(AXIS_Z, argPerigeeRad);
  v.applyAxisAngle(AXIS_Z, raanRad);
  return v;
}

/**
 * Points along one orbit for tube geometry (createOrbitLine).
 */
export function getOrbitLinePoints(
  satelliteData: SatelliteData,
  segments = 200
): THREE.Vector3[] {
  const radius = GLOBE_RADIUS * (1 + satelliteData.orbit.height);
  const inclination = satelliteData.orbit.inclination;
  const raan = satelliteData.rawData.RA_OF_ASC_NODE * (Math.PI / 180);
  const argPerigee = satelliteData.rawData.ARG_OF_PERICENTER * (Math.PI / 180);

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const point = getPositionAtPhase(
      angle,
      satelliteData.orbit.height,
      inclination,
      argPerigee,
      raan
    );
    points.push(point);
  }
  points.push(points[0].clone());
  return points;
}
