import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { feature } from 'topojson-client';
import * as satellite from 'satellite.js';

const Globe = () => {
  const containerRef = useRef(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [globe, setGlobe] = useState(null);
  const [satellites, setSatellites] = useState([]);
  const [controls, setControls] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const animationRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(null);
  
  // Constants
  const GLOBE_RADIUS = 5;
  const SATELLITE_SIZE = 0.15; // Increased size for better visibility
  const SATELLITE_ORBIT_HEIGHT = 0.5; // Add height to satellite orbits for visibility

  // Sample satellite TLEs (Two-Line Element sets)
  const sampleTLEs = [
    {
      name: 'ISS (ZARYA)',
      tleLine1: '1 25544U 98067A   23158.54037539  .00010780  00000+0  19952-3 0  9997',
      tleLine2: '2 25544  51.6415 183.9210 0002857 272.8083 223.7602 15.50266779399615'
    },
    {
      name: 'HUBBLE',
      tleLine1: '1 20580U 90037B   23158.48945205  .00000487  00000+0  16703-4 0  9993',
      tleLine2: '2 20580  28.4699 232.9546 0001366 123.1235 288.8670 15.09911698329906'
    },
    {
      name: 'NOAA 19',
      tleLine1: '1 33591U 09005A   23158.51068378  .00000145  00000+0  95263-4 0  9996',
      tleLine2: '2 33591  99.1691 206.1636 0013408 292.0608  67.9148 14.12523886735536'
    },
    {
      name: 'STARLINK-1019',
      tleLine1: '1 44713U 19074A   23158.48670347  .00014382  00000+0  91466-3 0  9996',
      tleLine2: '2 44713  53.0540 226.3036 0001341  83.5596 276.5526 15.16353248189853'
    },
    {
      name: 'GPS IIR-10',
      tleLine1: '1 28129U 03058A   23158.12083121 -.00000056  00000+0  00000+0 0  9990',
      tleLine2: '2 28129  56.4575 161.3485 0131510 261.5296 196.9329  2.00562592143236'
    }
  ];

  // Create satellite meshes
  const createSatellites = (scene, textureLoader) => {
    const satelliteMeshes = [];
    
    // Load the white dot texture
    const satelliteTexture = textureLoader.load('/dot-medium.13d7e8cb.png');
    
    sampleTLEs.forEach((tle, index) => {
      // Create sprite material with the white dot texture
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: satelliteTexture,
        color: 0xffffff, // White color
        sizeAttenuation: true
      });
      
      // Create sprite (always faces camera)
      const satelliteSprite = new THREE.Sprite(spriteMaterial);
      satelliteSprite.scale.set(SATELLITE_SIZE, SATELLITE_SIZE, 1);
      scene.add(satelliteSprite);
      
      // Create orbit line
      const orbitGeometry = new THREE.BufferGeometry();
      const orbitMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff, // White orbit lines
        transparent: true, 
        opacity: 0.3
      });
      const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
      scene.add(orbitLine);
      
      // Store both the satellite sprite and its orbit
      satelliteMeshes.push({
        mesh: satelliteSprite,
        orbit: orbitLine,
        tle: tle,
        satrec: satellite.twoline2satrec(tle.tleLine1, tle.tleLine2)
      });
    });
    
    return satelliteMeshes;
  };

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

    newRenderer.setSize(
      containerRef.current.clientWidth, 
      containerRef.current.clientHeight
    );
    newRenderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(newRenderer.domElement);

    // Add camera position
    newCamera.position.z = 12;

    // Set up OrbitControls with settings to allow free rotation
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    
    // Configure for smooth, unrestricted rotation
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.rotateSpeed = 0.5;
    newControls.minDistance = 6;
    newControls.maxDistance = 20;
    
    // Important settings to avoid pole constraints
    newControls.enableRotate = true;
    newControls.minPolarAngle = 0;
    newControls.maxPolarAngle = Math.PI;

    // Initialize raycaster and mouse
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // Create Earth with local high-resolution texture
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    
    // Use your high-res Earth texture
    const earthTexture = textureLoader.load('/earth-8k.webp');
    
    // Create a material for the globe
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color(0x333333),
      shininess: 5,
      bumpScale: 0.02
    });

    const newGlobe = new THREE.Mesh(globeGeometry, globeMaterial);
    newScene.add(newGlobe);

    // Add ambient light to ensure the entire globe is visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    newScene.add(ambientLight);
    
    // Add directional light to give some shading
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    newScene.add(directionalLight);

    // Create satellite objects
    const satelliteMeshes = createSatellites(newScene, textureLoader);

    // Store in state
    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setGlobe(newGlobe);
    setControls(newControls);
    setSatellites(satelliteMeshes);

    // Country boundaries (transparent white lines)
    const countriesGroup = new THREE.Group();
    newGlobe.add(countriesGroup);

    // Add mouse move handler for tooltip
    const onMouseMove = (event) => {
      if (!containerRef.current || !newCamera || !newScene || !raycasterRef.current || !mouseRef.current) return;

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / containerRef.current.clientWidth) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / containerRef.current.clientHeight) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, newCamera);

      // Calculate objects intersecting the picking ray
      const intersects = raycasterRef.current.intersectObjects(newScene.children, true);

      // Find if we're hovering over a satellite
      const satelliteIntersect = intersects.find(intersect =>
          intersect.object instanceof THREE.Sprite
      );

      if (satelliteIntersect) {
        const satelliteMesh = satelliteIntersect.object;
        const satelliteData = satelliteMeshes.find(sat => sat.mesh === satelliteMesh);

        if (satelliteData) {
          setTooltip({
            visible: true,
            text: satelliteData.tle.name,
            x: event.clientX - rect.left + 10,
            y: event.clientY - rect.top + 10
          });
        }
      } else {
        setTooltip({ visible: false, text: '', x: 0, y: 0 });
      }
    };

    containerRef.current.addEventListener('mousemove', onMouseMove);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // Update satellite positions every frame
      updateSatellitePositions(satelliteMeshes);
      
      if (newControls) newControls.update();
      if (newRenderer && newScene && newCamera) {
        newRenderer.render(newScene, newCamera);
      }
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !newCamera || !newRenderer) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      newCamera.aspect = width / height;
      newCamera.updateProjectionMatrix();
      
      newRenderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', onMouseMove);
        if (newRenderer) {
          containerRef.current.removeChild(newRenderer.domElement);
        }
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Remove satellites from dependency array

  // Update satellite positions based on current time
  const updateSatellitePositions = (satelliteMeshes) => {
    // Get current time
    const now = new Date();
    
    satelliteMeshes.forEach(sat => {
      // Calculate satellite position
      const positionAndVelocity = satellite.propagate(sat.satrec, now);
      
      // If position couldn't be calculated, skip this satellite
      if (!positionAndVelocity.position) return;
      
      // Convert position from km to Three.js units
      const earthRadiusInKm = 6371;
      const scale = GLOBE_RADIUS / earthRadiusInKm;
      
      const position = positionAndVelocity.position;
      const x = position.x * scale;
      const y = position.z * scale; // Swap y and z to match Three.js coordinate system
      const z = -position.y * scale; // Invert y
      
      // Update satellite position
      sat.mesh.position.set(x, y, z);
      
      // Update orbit line
      updateOrbitLine(sat, scale);
    });
  };
  
  // Update the orbit line for a satellite
  const updateOrbitLine = (sat, scale) => {
    const earthRadiusInKm = 6371;
    const scaleFactor = scale || GLOBE_RADIUS / earthRadiusInKm;
    const points = [];
    
    // Generate points along orbit at regular intervals
    const minutesPerOrbit = 90; // Approximate for LEO satellites
    const pointsCount = 100;
    
    for (let i = 0; i < pointsCount; i++) {
      const date = new Date();
      date.setMinutes(date.getMinutes() + (i * minutesPerOrbit / pointsCount));
      
      const posAndVel = satellite.propagate(sat.satrec, date);
      if (posAndVel.position) {
        const pos = posAndVel.position;
        points.push(
          new THREE.Vector3(
            pos.x * scaleFactor,
            pos.z * scaleFactor,
            -pos.y * scaleFactor
          )
        );
      }
    }
    
    if (points.length > 1) {
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
      sat.orbit.geometry.dispose();
      sat.orbit.geometry = orbitGeometry;
    }
  };

  // Helper function to convert lat/long to 3D coords
  const latLongToVector3 = (latitude, longitude, radius) => {
    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);

    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
            zIndex: 1000
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default Globe;
