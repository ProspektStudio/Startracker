# Globe performance improvements

This document lists performance improvement opportunities for the 3D globe, especially for **~10k satellites**. Items marked **Done** have been implemented; others are recommendations for future work.

---

## 1. Orbit lines – create only the active one ✅ Done

**Problem:** One `TubeGeometry` mesh was created per satellite and added to the scene. With 10k satellites that meant 10k meshes (each with 200 segments × 16 radial segments), even though only the selected orbit is visible.

**Solution:** Orbit lines are no longer pre-created. A single orbit mesh is created **on demand** when the user selects a satellite (click or dropdown). It is stored in `activeOrbitRef` and replaced when another satellite is selected or the group changes.

**Where:** `Globe.tsx` (`createSatellites`, `handleSatelliteSelect`), `useGlobePointer.ts` (`handleClick`). No `orbitLinesRef` array.

**Impact:** Removes ~10k meshes from the scene and their draw/update cost; large memory and GPU win at 10k scale.

---

## 2. Orbit line scale with zoom ✅ Done

**Problem:** The orbit line was scaled every frame with `scaleFactor = cameraDistance / 12`, which kept its **screen** size roughly constant. From the user’s perspective the orbit didn’t “change” with zoom.

**Solution:** Per-frame orbit scaling was removed. The orbit keeps the scale set when it’s created (e.g. 1.1). It has fixed size in **world** space, so zooming in makes it appear larger on screen and zooming out makes it appear smaller.

**Where:** `hooks/useGlobeAnimation.ts` – orbit scale logic was removed from the animation loop.

**Impact:** Correct visual behavior (orbit responds to camera position); one less per-frame update.

---

## 3. Position updates in vertex shader (not done)

**Problem:** Every frame the animation loop runs a JS loop over all satellites: compute position with `getPositionAtPhase`, write to the position buffer, set `needsUpdate = true`. With 10k satellites that’s 10k iterations and one buffer upload per frame.

**Recommendation:** Move position computation to the GPU:

- Store per-satellite orbit params in **buffer attributes** (e.g. `height`, `inclination`, `raan`, `argPerigee`, `initialPhase`, `orbitalSpeed`).
- Use a **uniform** (e.g. `uTime` from `performance.now() * 0.001`).
- In a **custom vertex shader**, compute `phase = mod(initialPhase + uTime * orbitalSpeed, 2*PI)` and the same position math as `getPositionAtPhase` (see `lib/globe/orbitMath.ts`), then set `gl_Position` from that.

**Where to implement:**

- **`lib/globe/`** – New helper (e.g. `satellitePointsMaterial.ts`) that builds the Points geometry with orbit attributes and a custom `ShaderMaterial` (vertex + fragment).
- **`useGlobeAnimation`** – Only update `uTime` each frame; remove the position loop and position buffer upload.
- **`Globe.tsx` `createSatellites`** – Use the new helper to create the Points (orbit-attributed geometry + custom material).

**Impact:** No per-frame CPU loop over 10k satellites and no per-frame position buffer upload; positions computed on GPU.

---

## 4. Color in fragment shader (not done)

**Problem:** When hover or selection changes, `updatePointColors` in `lib/globe/threeUtils.ts` loops over all points and writes the color buffer, then sets `needsUpdate = true`. With 10k points that’s 10k color writes and a buffer update on every hover/select.

**Recommendation:** Drive point color from the GPU:

- Use the same custom Points material as for positions (or extend it).
- Pass **uniforms** `selectedIndex` and `hoveredIndex` (e.g. `float` or `int`).
- In the **fragment shader**, use the point index (e.g. from a varying set in the vertex shader, or `gl_VertexID` in WebGL2) to output green for selected/hovered and white otherwise.

**Where to implement:**

- **`lib/globe/`** – Custom Points material with `selectedIndex` / `hoveredIndex` uniforms.
- **`useGlobePointer`** and **`Globe.tsx`** – Set material uniforms instead of calling `updatePointColorsUtil`.

**Impact:** No color buffer and no 10k-iteration color update on hover/select.

---

## 5. Raycasting / picking (not done)

**Problem:** Three.js raycaster for `Points` tests the ray against each point (or a subset). With 10k points, mousemove can be heavy even with throttling.

**Current state:** Throttling is in place (`MOUSE_THROTTLE_MS` in `lib/globe/orbitMath.ts`; used in `useGlobePointer`).

**Recommendations:**

- **Increase throttle** – Raise `MOUSE_THROTTLE_MS` (e.g. 50 → 80–100 ms) for 10k points to reduce raycasts per second.
- **GPU picking** – Render point indices to a small offscreen buffer and read the pixel under the cursor; O(1) pick.
- **Spatial acceleration** – Maintain a spatial structure (e.g. grid) over point positions and only raycast points in the same cell as the ray (requires updating the structure when positions change or using a CPU proxy if positions are computed in shader).

**Where:** `lib/globe/orbitMath.ts` (throttle constant), `hooks/useGlobePointer.ts` (raycast / picking logic).

**Impact:** Smoother interaction and better scaling for large point counts.

---

## Summary table

| Item                         | Status   | Impact at 10k satellites                          |
|-----------------------------|----------|---------------------------------------------------|
| Orbit lines: only active one | ✅ Done  | ~10k fewer meshes; large memory and draw savings   |
| Orbit line scale with zoom  | ✅ Done  | Correct visual behavior; one less per-frame update |
| Positions in vertex shader  | Not done | No CPU position loop; no per-frame position upload |
| Color in fragment shader    | Not done | No color buffer; no 10k color writes on hover/select |
| Raycasting / picking       | Partial  | Throttling exists; GPU or spatial can improve further |

---

## References

- **Orbit math:** `lib/globe/orbitMath.ts` – `getPositionAtPhase`, `getOrbitLinePoints`, constants.
- **Point colors, camera fly-to:** `lib/globe/threeUtils.ts`.
- **Animation loop:** `hooks/useGlobeAnimation.ts`.
- **Pointer / raycaster:** `hooks/useGlobePointer.ts`.
- **Code organization:** `client/CODE_ORGANIZATION.md`.
