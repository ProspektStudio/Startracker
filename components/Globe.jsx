import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { feature } from 'topojson-client';

const Globe = () => {
  const containerRef = useRef(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [globe, setGlobe] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [controls, setControls] = useState(null);
  
  // Enhanced lighting options with more control
  const [lighting, setLighting] = useState({
    ambientIntensity: 0.3,
    ambientColor: 0x404040,
    directionalIntensity: 1.0,
    directionalColor: 0xffffff,
    directionalPosition: { x: 5, y: 3, z: 5 },
    hemisphereIntensity: 0.5,
    hemisphereColorTop: 0x0077ff,
    hemisphereColorBottom: 0x004488
  });

  // Constants
  const GLOBE_RADIUS = 5;

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

    // Add OrbitControls
    const newControls = new OrbitControls(newCamera, newRenderer.domElement);
    newControls.enableDamping = true;
    newControls.dampingFactor = 0.05;
    newControls.rotateSpeed = 0.5;
    newControls.minDistance = 6;
    newControls.maxDistance = 20;

    // Create Earth
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    
    const earthTexture = textureLoader.load(
      'https://unpkg.com/three-globe@2.24.10/example/img/earth-blue-marble.jpg'
    );
    const bumpMap = textureLoader.load(
      'https://unpkg.com/three-globe@2.24.10/example/img/earth-topology.png'
    );
    const specularMap = textureLoader.load(
      'https://unpkg.com/three-globe@2.24.10/example/img/earth-water.png'
    );

    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpMap,
      bumpScale: 0.05,
      specularMap: specularMap,
      specular: new THREE.Color('grey'),
      shininess: 5
    });

    const newGlobe = new THREE.Mesh(globeGeometry, globeMaterial);
    newScene.add(newGlobe);

    // Add lighting
    setupLighting(newScene, lighting);

    // Store in state
    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setGlobe(newGlobe);
    setControls(newControls);

    // Load country boundaries
    const countriesGroup = new THREE.Group();
    newGlobe.add(countriesGroup);

    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(worldData => {
        const countries = feature(worldData, worldData.objects.countries);

        countries.features.forEach(country => {
          const countryGeometry = new THREE.BufferGeometry();
          const vertices = [];
          
          // Process each polygon
          country.geometry.coordinates.forEach(polygon => {
            // Handle MultiPolygon vs Polygon
            const coords = polygon[0] ? polygon[0] : polygon;
            
            coords.forEach(coord => {
              const [longitude, latitude] = coord;
              const point3D = latLongToVector3(latitude, longitude, GLOBE_RADIUS * 1.001);
              vertices.push(point3D.x, point3D.y, point3D.z);
            });
          });
          
          countryGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
          
          const countryLine = new THREE.Line(
            countryGeometry,
            new THREE.LineBasicMaterial({ 
              color: 0xffffff,
              transparent: true,
              opacity: 0.5
            })
          );
          
          countriesGroup.add(countryLine);
        });
      })
      .catch(error => console.error('Error loading country data:', error));

    // Add sample markers
    const sampleCoordinates = [
      { lat: 40.7128, lng: -74.0060, name: "New York", value: 8419000, color: 0xff0000 },
      { lat: 51.5074, lng: -0.1278, name: "London", value: 8982000, color: 0x00ff00 },
      { lat: 35.6762, lng: 139.6503, name: "Tokyo", value: 13960000, color: 0x0000ff },
      { lat: -33.8688, lng: 151.2093, name: "Sydney", value: 5312000, color: 0xff00ff },
      { lat: -1.2921, lng: 36.8219, name: "Nairobi", value: 4397000, color: 0xffff00 }
    ];

    const newMarkers = sampleCoordinates.map(coord => {
      const size = 0.05 + (coord.value / 20000000) * 0.1;
      return addMarker(newGlobe, coord.lat, coord.lng, size, coord.color, {
        name: coord.name,
        value: coord.value
      });
    });

    setMarkers(newMarkers);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Add subtle rotation when not interacting
      if (newControls && !newControls.enabled) {
        newGlobe.rotation.y += 0.0005;
      }
      
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
      if (containerRef.current && newRenderer) {
        containerRef.current.removeChild(newRenderer.domElement);
      }
    };
  }, []);

  // Update lighting when lighting settings change
  useEffect(() => {
    if (scene) {
      // Remove existing lights
      scene.children = scene.children.filter(child => 
        !(child instanceof THREE.AmbientLight) && 
        !(child instanceof THREE.DirectionalLight) && 
        !(child instanceof THREE.HemisphereLight)
      );
      
      // Add new lights with updated settings
      setupLighting(scene, lighting);
    }
  }, [lighting, scene]);

  // Helper function to set up lighting
  const setupLighting = (scene, options) => {
    // Ambient light (overall scene illumination)
    const ambientLight = new THREE.AmbientLight(
      options.ambientColor, 
      options.ambientIntensity
    );
    scene.add(ambientLight);

    // Directional light (simulates sun)
    const directionalLight = new THREE.DirectionalLight(
      options.directionalColor, 
      options.directionalIntensity
    );
    directionalLight.position.set(
      options.directionalPosition.x,
      options.directionalPosition.y,
      options.directionalPosition.z
    );
    scene.add(directionalLight);

    // Hemisphere light (sky and ground colors)
    const hemisphereLight = new THREE.HemisphereLight(
      options.hemisphereColorTop,
      options.hemisphereColorBottom,
      options.hemisphereIntensity
    );
    scene.add(hemisphereLight);
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

  // Helper function to add a marker
  const addMarker = (globe, latitude, longitude, size, color, data) => {
    const position = latLongToVector3(latitude, longitude, GLOBE_RADIUS + 0.05);
    
    const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(markerGeometry, markerMaterial);
    
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData = { 
      marker: {
        latitude,
        longitude,
        data
      }
    };
    
    globe.add(mesh);
    
    return {
      mesh,
      data,
      latitude,
      longitude
    };
  };

  // Public method to add coordinate marker
  const addCoordinateMarker = (latitude, longitude, name, value, color = 0xff0000) => {
    if (!globe) return null;
    
    const size = 0.05 + (value / 20000000) * 0.1;
    const marker = addMarker(globe, latitude, longitude, size, color, {
      name,
      value
    });
    
    setMarkers(prev => [...prev, marker]);
    return marker;
  };

  // Public method to update marker data
  const updateMarkerData = (marker, newData) => {
    if (!marker || !marker.mesh) return;
    
    marker.data = { ...marker.data, ...newData };
    
    if (newData.value !== undefined) {
      const newSize = 0.05 + (newData.value / 20000000) * 0.1;
      marker.mesh.scale.set(newSize/0.1, newSize/0.1, newSize/0.1);
    }
    
    if (newData.color !== undefined) {
      marker.mesh.material.color.set(newData.color);
    }
    
    setMarkers(prev => [...prev]);
  };

  // Expose methods to window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addCoordinateMarker = addCoordinateMarker;
      window.updateMarkerData = updateMarkerData;
      window.adjustLighting = setLighting;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete window.addCoordinateMarker;
        delete window.updateMarkerData;
        delete window.adjustLighting;
      }
    };
  }, [globe]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
};

export default Globe; 