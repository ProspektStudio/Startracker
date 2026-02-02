import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ORBIT_SPEED, getPositionAtPhase } from '@/lib/globe/orbitMath';
import type { SatellitePointData } from '@/lib/globe/types';

export interface UseGlobeAnimationRefs {
  animationRef: React.MutableRefObject<number | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  satellitePointsRef: React.MutableRefObject<THREE.Points | null>;
  satelliteDataRef: React.MutableRefObject<SatellitePointData[]>;
  activeOrbitRef: React.MutableRefObject<THREE.Mesh | null>;
  orbitPositionVecRef: React.MutableRefObject<THREE.Vector3 | null>;
  fpsRef: React.MutableRefObject<number>;
  frameTimesRef: React.MutableRefObject<number[]>;
  lastFrameTimeRef: React.MutableRefObject<number>;
}

export function useGlobeAnimation(
  scene: THREE.Scene | null,
  camera: THREE.PerspectiveCamera | null,
  renderer: THREE.WebGLRenderer | null,
  controls: OrbitControls | null,
  refs: UseGlobeAnimationRefs
) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  useEffect(() => {
    if (!scene || !camera || !renderer || !controls) return;

    const refs = refsRef.current;
    refs.cameraRef.current = camera;

    const animate = () => {
      const r = refsRef.current;
      const now = performance.now();
      const deltaTime = now - r.lastFrameTimeRef.current;
      r.lastFrameTimeRef.current = now;

      r.frameTimesRef.current.push(deltaTime);
      if (r.frameTimesRef.current.length > 60) {
        r.frameTimesRef.current.shift();
      }
      const averageDeltaTime =
        r.frameTimesRef.current.reduce((a, b) => a + b, 0) / r.frameTimesRef.current.length;
      r.fpsRef.current = Math.round(1000 / averageDeltaTime);

      r.animationRef.current = requestAnimationFrame(animate);

      const points = r.satellitePointsRef.current;
      const pos = r.orbitPositionVecRef.current;
      if (points?.geometry?.attributes?.position && pos) {
        const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        const data = r.satelliteDataRef.current;
        const degToRad = Math.PI / 180;
        for (let i = 0; i < data.length; i++) {
          const sat = data[i];
          const orbitalSpeed = ORBIT_SPEED * Math.pow(sat.data.orbit.height, -1.5);
          sat.phase = (sat.phase + orbitalSpeed) % (Math.PI * 2);
          getPositionAtPhase(
            sat.phase,
            sat.data.orbit.height,
            sat.data.orbit.inclination,
            sat.data.rawData.ARG_OF_PERICENTER * degToRad,
            sat.data.rawData.RA_OF_ASC_NODE * degToRad,
            pos
          );
          posArray[i * 3] = pos.x;
          posArray[i * 3 + 1] = pos.y;
          posArray[i * 3 + 2] = pos.z;
        }
        posAttr.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (refs.animationRef.current) {
        cancelAnimationFrame(refs.animationRef.current);
        refs.animationRef.current = null;
      }
    };
  }, [scene, camera, renderer, controls]);
}
