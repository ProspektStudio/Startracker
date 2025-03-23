import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
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

    // Replace OrbitControls with TrackballControls for unrestricted rotation
    const newControls = new TrackballControls(newCamera, newRenderer.domElement);
    
    // Basic TrackballControls settings
    newControls.rotateSpeed = 3.0;
    newControls.zoomSpeed = 1.2;
    newControls.panSpeed = 0.8;
    newControls.noZoom = false;
    newControls.noPan = false;
    newControls.staticMoving = false;
    newControls.dynamicDampingFactor = 0.2;
    newControls.minDistance = 6;
    newControls.maxDistance = 20;
    
    // Create Earth using high-resolution textures
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128); // Higher resolution geometry
    const textureLoader = new THREE.TextureLoader();
    
    // Higher resolution textures (8k)
    const earthTexture = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_8k.jpg'
    );
    
    const bumpMap = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/elev_bump_8k.jpg'
    );
    
    const normalMap = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/8081_earthbump10k.jpg'
    );
    
    const specularMap = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/water_8k.png'
    );
    
    const cloudsTexture = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_8k.jpg'
    );

    // Enhanced material with displacement mapping
    const globeMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpMap,
      bumpScale: 0.08,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.05, 0.05),
      specularMap: specularMap,
      specular: new THREE.Color(0x333333),
      shininess: 15,
      displacementMap: bumpMap, // Use bump map for displacement to create terrain
      displacementScale: 0.08,  // Subtle displacement for terrain
    });

    // Create a separate ocean material with a solid color
    const oceanMaterial = new THREE.MeshPhongMaterial({
      color: 0x4287f5, // Ocean blue color - you can change this to any color
      shininess: 60,
      transparent: true,
      opacity: 0.9
    });

    // Create a material that combines land and ocean
    const materials = [oceanMaterial, globeMaterial];
    
    // Create a shader material that will display either the land or ocean
    const globeShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        oceanColor: { value: new THREE.Color(66/255, 135/255, 245/255) },
        earthTexture: { value: earthTexture },
        bumpMap: { value: bumpMap },
        bumpScale: { value: 0.08 },
        normalMap: { value: normalMap },
        specularMap: { value: specularMap }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 oceanColor;
        uniform sampler2D earthTexture;
        uniform sampler2D bumpMap;
        uniform sampler2D normalMap;
        uniform sampler2D specularMap;
        uniform float bumpScale;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vec4 texColor = texture2D(earthTexture, vUv);
          float landMask = texture2D(bumpMap, vUv).r;
          
          // If pixel is darker in bump map (water), use ocean color
          // The threshold value 0.2 can be adjusted to better separate land and water
          if (landMask < 0.2) {
            gl_FragColor = vec4(oceanColor, 1.0);
          } else {
            gl_FragColor = texColor;
          }
        }
      `
    });

    const newGlobe = new THREE.Mesh(globeGeometry, globeShaderMaterial);
    newScene.add(newGlobe);

    // Add cloud layer
    const cloudGeometry = new THREE.SphereGeometry(GLOBE_RADIUS + 0.15, 64, 64);
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.4,
      alphaMap: cloudsTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    newGlobe.add(clouds);

    // Add slow rotation to clouds
    const animateClouds = () => {
      clouds.rotation.y += 0.0002;
      requestAnimationFrame(animateClouds);
    };
    
    animateClouds();

    // Add lighting
    setupLighting(newScene);

    // Store in state
    setScene(newScene);
    setCamera(newCamera);
    setRenderer(newRenderer);
    setGlobe(newGlobe);
    setControls(newControls);

    // Load country boundaries
    const countriesGroup = new THREE.Group();
    newGlobe.add(countriesGroup);

    // Use a more reliable countries dataset with error handling
    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(worldData => {
        if (!worldData || !worldData.objects || !worldData.objects.countries) {
          console.error('Invalid world data format:', worldData);
          return;
        }
        
        try {
          const countries = feature(worldData, worldData.objects.countries);
          
          if (!countries || !countries.features) {
            console.error('Could not process countries data');
            return;
          }
          
          countries.features.forEach(country => {
            // Skip countries with no geometry
            if (!country.geometry || !country.geometry.coordinates || country.geometry.coordinates.length === 0) {
              return;
            }
            
            const countryGeometry = new THREE.BufferGeometry();
            const vertices = [];
            
            try {
              // Process each polygon
              country.geometry.coordinates.forEach(polygon => {
                // Handle MultiPolygon vs Polygon
                const coords = polygon[0] ? polygon[0] : polygon;
                
                if (Array.isArray(coords)) {
                  coords.forEach(coord => {
                    if (Array.isArray(coord) && coord.length >= 2) {
                      const [longitude, latitude] = coord;
                      const point3D = latLongToVector3(latitude, longitude, GLOBE_RADIUS * 1.001);
                      vertices.push(point3D.x, point3D.y, point3D.z);
                    }
                  });
                }
              });
              
              if (vertices.length > 0) {
                countryGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                
                const countryLine = new THREE.Line(
                  countryGeometry,
                  new THREE.LineBasicMaterial({ 
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.7, // Made more visible
                    linewidth: 1.5 // Note: this may not work on all platforms due to WebGL limitations
                  })
                );
                
                countriesGroup.add(countryLine);
              }
            } catch (err) {
              console.error('Error processing country:', country.properties?.name, err);
            }
          });
        } catch (err) {
          console.error('Error processing countries data:', err);
        }
      })
      .catch(error => {
        console.error('Error loading country data:', error);
        // Fallback - load a backup countries file or try a different strategy
      });

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
      newControls.handleResize(); // TrackballControls needs this
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
      // Remove existing directional lights but keep ambient
      scene.children = scene.children.filter(child => 
        !(child instanceof THREE.DirectionalLight) && 
        !(child instanceof THREE.HemisphereLight) &&
        !(child instanceof THREE.PointLight)
      );
      
      // Make sure we have our bright ambient light
      const hasAmbient = scene.children.some(child => child instanceof THREE.AmbientLight);
      if (!hasAmbient) {
        const brightLight = new THREE.AmbientLight(0xffffff, 1.5);
        scene.add(brightLight);
      }
    }
  }, [lighting, scene]);

  // Simplified lighting setup function
  const setupLighting = (scene) => {
    // Just add a bright ambient light for full visibility
    const brightLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(brightLight);
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
    const position = latLongToVector3(latitude, longitude, GLOBE_RADIUS + 0.1); // Raised slightly above terrain
    
    // Create a more detailed marker
    const markerGeometry = new THREE.SphereGeometry(size, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(markerGeometry, markerMaterial);
    
    // Add a pulsing effect
    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(size * 1.3, 16, 16),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.4
      })
    );
    
    // Animate the pulse
    const animatePulse = () => {
      pulse.scale.x = 1 + Math.sin(Date.now() * 0.003) * 0.2;
      pulse.scale.y = 1 + Math.sin(Date.now() * 0.003) * 0.2;
      pulse.scale.z = 1 + Math.sin(Date.now() * 0.003) * 0.2;
      requestAnimationFrame(animatePulse);
    };
    
    animatePulse();
    
    mesh.add(pulse);
    mesh.position.set(position.x, position.y, position.z);
    mesh.userData = { 
      marker: {
        latitude,
        longitude,
        data
      }
    };
    
    // Make marker always face the camera
    mesh.lookAt(0, 0, 0);
    
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
      
      // Update pulse color if it exists
      if (marker.mesh.children && marker.mesh.children[0]) {
        marker.mesh.children[0].material.color.set(newData.color);
      }
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