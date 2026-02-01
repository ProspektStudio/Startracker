# Client code organization

This document describes how the StarTracker client is structured so Cursor (or any developer) can navigate and modify it correctly.

## High-level architecture

The main screen is a 3D globe with satellite points and a side panel. The globe is built from:

- **Globe.tsx** – Orchestrator: composes hooks, owns refs and group/satellite logic, renders the canvas container and overlays.
- **lib/globe/** – Pure logic and constants for the globe: orbit math, Three.js helpers, types.
- **hooks/** – React hooks that own scene lifecycle, animation loop, and pointer (raycaster, tooltip, popup).

Data flow:

- **Zustand** (`useClientStore`) holds `selectedGroup`, `satellites`, `selectedSatellite`; components read and update this.
- **Satellite data** is loaded by `getSatelliteData(selectedGroup)` from `services/satelliteData` (Celestrak + IndexedDB cache).
- **Pointer state** (tooltip, popup) is owned by `useGlobePointer` and returned to Globe for rendering.

## Directory layout

```
client/
├── components/       # React UI components
├── hooks/            # React hooks (store, globe scene/animation/pointer)
├── lib/globe/        # Globe-specific logic (orbit math, Three.js utils, types)
├── pages/            # Next.js pages (_app, index)
├── services/         # API client, satellite data fetch/cache, shared types
├── styles/           # Global CSS
└── public/           # Static assets (textures, images, fonts)
```

## lib/globe/ – Globe logic and constants

Shared, mostly pure code used by Globe and its hooks. No React, no DOM except where noted.

| File | Purpose |
|------|--------|
| **orbitMath.ts** | Constants (`GLOBE_RADIUS`, `SATELLITE_SIZE`, `ORBIT_SPEED`, colors, `MOUSE_THROTTLE_MS`). `getPositionAtPhase(phase, height, inclination, argPerigeeRad, raanRad, out?)` – single source of truth for satellite position from orbital phase. `getOrbitLinePoints(satelliteData, segments)` – points for orbit tube geometry. |
| **threeUtils.ts** | `getCirclePointTexture()` – singleton canvas texture for point sprites. `updatePointColors(points, selectedIndex, hoveredIndex, colors?)` – writes into Points buffer for highlight/white. `flyToCamera(camera, controls, targetPosition, distance, durationMs, onComplete?)` – camera fly-to with cubic ease-out. |
| **types.ts** | `SatellitePointData`, `TooltipState`, `PopupState` (Globe/pointer-related types; `SatelliteData` lives in `services/types`). |

## hooks/ – React hooks

| Hook | Purpose |
|------|--------|
| **useClientStore** | Zustand store: `selectedGroup`, `satellites`, `selectedSatellite`, setters. Also exports `groups` for the group dropdown. |
| **useGlobeScene** | Creates Three.js scene, camera, renderer, OrbitControls, globe mesh, lights; mounts renderer into `containerRef`; handles resize and dispose. Returns `{ scene, camera, renderer, controls }`. Accepts refs for `initialCameraPosition`, `initialControlsTarget`, and optional `cameraRef`. |
| **useGlobeAnimation** | Runs the requestAnimationFrame loop when scene/camera/renderer/controls are set: FPS into ref, satellite positions via `getPositionAtPhase`, active orbit scale by camera distance, `controls.update()`, `renderer.render()`. Uses only refs inside the loop (no React state). Cleanup cancels the frame. |
| **useGlobePointer** | When scene/camera/renderer/controls are set: creates raycaster and mouse vector, defines throttled mousemove and click handlers (tooltip, selection, orbit visibility, `flyToCamera`, active orbit). Owns `tooltip` and `popup` state. Returns `{ tooltip, popup, setTooltip, setPopup }`. Listeners are attached by Globe after `createSatellites` resolves (see Globe effect). |

## Globe.tsx – Orchestrator

- **Store:** `useClientStore()` for group, satellites, selection.
- **Refs:** Many refs for Three.js objects, mouse/raycaster, throttle state, and `attachedPointerListenersRef` so cleanup can remove pointer listeners.
- **Hooks:** `useGlobeScene(containerRef, refs)` → `useGlobeAnimation(..., refs)` → `createOrbitLine` (useCallback) → `useGlobePointer(..., createOrbitLine)`.
- **createSatellites** (useCallback, deps: `selectedGroup`, `createOrbitLine`): Fetches data, builds orbit lines and Points geometry, updates refs and `setSatellites`. Called on initial scene ready and when `selectedGroup` changes via `handleGroupSelect`.
- **handleGroupSelect** (useCallback): Clears scene of points/orbits, then `createSatellites(scene)`. Triggered by `useEffect([selectedGroup, handleGroupSelect])`.
- **handleSatelliteSelect** (useCallback): Updates point colors, orbit visibility, then `flyToCamera(..., onComplete: setPopup)`. Triggered by `useEffect([selectedSatellite, handleSatelliteSelect])`.
- **Effect [scene, camera, renderer, controls]:** Inits orbit vec refs, calls `createSatellites(newScene).then(...)` and attaches pointer listeners from refs (`onMouseMoveRef`, `handleClickRef`). Cleanup: throttle timeout, detach listeners (via `attachedPointerListenersRef`), remove points/orbits from scene, clear refs. Does **not** create scene/renderer or run the animation loop (those are in hooks).

## Other components

- **SidePanel** – Right panel: group/satellite dropdown (CurrentlyViewing), image, AI/Orbit tabs (AiInfo, OrbitInfo).
- **CurrentlyViewing** – Group and satellite dropdowns bound to `useClientStore`.
- **Tooltip** – Absolute-position tooltip/popup label used by Globe for hover and selection popup.
- **FPSCounter** – Reads `fpsRef` on an interval; used by Globe.
- **AiInfo, OrbitInfo, SatelliteImage** – Side-panel content for the selected satellite.

## Services

- **apiClient** – Fetch wrapper for backend; `hello`, `streamSatelliteInfo`, etc.
- **satelliteData** – `getSatelliteData(group)`: Celestrak fetch, IndexedDB cache (Dexie), maps to `SatelliteData[]` with orbit/position.
- **types** – `CelestrakResponse`, `SatelliteData` (shared with api-py).

## Conventions

1. **Path alias:** `@/` points to `client/` (e.g. `@/lib/globe/orbitMath`, `@/hooks/useClientStore`).
2. **Globe refs:** Three.js objects and mutable state used across effects/callbacks live in refs so the animation loop and pointer handlers don’t depend on React state.
3. **Stable callbacks:** `createOrbitLine`, `createSatellites`, `handleGroupSelect`, `handleSatelliteSelect` are wrapped in `useCallback` with correct deps so effects and hooks don’t re-run unnecessarily.
4. **Pointer listeners:** Attached in Globe’s effect **after** `createSatellites` resolves; stored in `attachedPointerListenersRef` so cleanup can remove them even if hook refs are cleared first.
5. **API warmup:** `useQuery({ queryKey: ['hello'], queryFn: apiClient.hello })` runs in `_app.tsx` via `ApiWarmup`; Globe does not own it.

## Where to change what

| Change | Location |
|--------|----------|
| Orbit math, globe/satellite constants | `lib/globe/orbitMath.ts` |
| Point colors, circle texture, camera fly-to | `lib/globe/threeUtils.ts` |
| Scene/camera/renderer/lights setup or resize | `hooks/useGlobeScene.ts` |
| Animation loop (FPS, satellite positions, render) | `hooks/useGlobeAnimation.ts` |
| Raycaster, tooltip, popup, click-to-select, camera fly on click | `hooks/useGlobePointer.ts` |
| Group/satellite list, createSatellites, handleGroupSelect, handleSatelliteSelect | `components/Globe.tsx` |
| Store shape or group list | `hooks/useClientStore.ts` |
| Satellite fetch/cache or mapping | `services/satelliteData.ts` |
