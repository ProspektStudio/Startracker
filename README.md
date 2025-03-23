# Interactive Earth Globe with Next.js

A Next.js application that displays an interactive 3D globe of Earth with country boundaries, coordinate mapping, and advanced lighting controls.

## Features

- Realistic Earth texture with country boundaries
- Place markers at specific latitude/longitude coordinates
- Interactive lighting controls to adjust the globe's appearance
- Markers can be sized based on data values (e.g., population)
- Interactive markers that display information on click
- Fully rotatable and zoomable 3D globe
- Responsive design that works on different screen sizes

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Lighting Controls

Click the "Show Lighting Controls" button in the top-right corner to access the lighting control panel. You can adjust:

- Ambient light (overall scene illumination)
- Directional light (sun-like directional light)
- Hemisphere light (sky and ground colors)

After making adjustments, click "Apply Lighting Changes" to see the results.

## API

The application exposes several functions through the browser console:

1. `addCoordinateMarker(latitude, longitude, name, value, color)`
   - Add a new marker at the specified coordinates
   - Parameters:
     - `latitude`: Latitude in decimal degrees (e.g., 40.7128)
     - `longitude`: Longitude in decimal degrees (e.g., -74.0060)
     - `name`: Location name (e.g., "New York")
     - `value`: Numeric value that determines marker size (e.g., population)
     - `color`: Hexadecimal color value (optional, default is red)

2. `updateMarkerData(marker, newData)`
   - Update an existing marker's data
   - Parameters:
     - `marker`: The marker object returned by `addCoordinateMarker`
     - `newData`: Object containing properties to update (e.g., `{value: 10000000, color: 0x00ff00}`)

3. `adjustLighting(options)`
   - Update the globe's lighting settings
   - Parameters:
     - `options`: Object containing lighting properties to update

## Example Usage

Open your browser's console and try:

```javascript
// Add a new marker for Berlin
const berlinMarker = addCoordinateMarker(52.5200, 13.4050, "Berlin", 3769000, 0x00ffff);

// Later, update the marker's data
updateMarkerData(berlinMarker, {
  value: 4000000,  // Update the value
  color: 0xff00ff  // Change the color
});

// Adjust lighting
adjustLighting({
  ambientIntensity: 0.5,
  directionalIntensity: 1.2,
  directionalPosition: { x: -5, y: 8, z: 2 }
});
```

## Technologies Used

- Next.js
- React
- Three.js for 3D rendering
- D3.js and TopoJSON for geographical data 