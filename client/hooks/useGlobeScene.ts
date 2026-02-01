import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLOBE_RADIUS } from '@/lib/globe/orbitMath';

export interface UseGlobeSceneRefs {
  initialCameraPositionRef: React.MutableRefObject<THREE.Vector3 | null>;
  initialControlsTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
  cameraRef?: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export function useGlobeScene(
  containerRef: React.RefObject<HTMLDivElement | null>,
  refs: UseGlobeSceneRefs
) {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [controls, setControls] = useState<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.warn('Container not ready for WebGLRenderer initialization');
      return;
    }

    const newScene = new THREE.Scene();
    const newCamera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    const newRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const updateRendererSize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      newRenderer.setSize(width, height);
      newCamera.aspect = width / height;
      newCamera.updateProjectionMatrix();
    };

    updateRendererSize();
    container.appendChild(newRenderer.domElement);

    const handleResize = () => updateRendererSize();
    window.addEventListener('resize', handleResize);

    refs.initialCameraPositionRef.current = newCamera.position.clone();
    refs.initialControlsTargetRef.current = new THREE.Vector3(0, 0, 0);

    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/earth-8k.webp');
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color(0x333333),
      shininess: 5,
      bumpScale: 0.02,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    newScene.add(globeMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    newScene.add(directionalLight);

    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.rotateSpeed = 0.5;
    newControls.minDistance = 5;
    newControls.maxDistance = 30;

    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setControls(newControls);
    if (refs.cameraRef) refs.cameraRef.current = newCamera;
    rendererRef.current = newRenderer;
    controlsRef.current = newControls;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      controlsRef.current?.dispose();
      rendererRef.current?.dispose();
      rendererRef.current = null;
      controlsRef.current = null;
      if (refs.cameraRef) refs.cameraRef.current = null;
    };
  }, []);

  return { scene, camera, renderer, controls };
}
