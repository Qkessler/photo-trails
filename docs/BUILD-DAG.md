# Build DAG: Photos on Trails

Tasks are numbered. Dependencies listed as `depends_on: [task IDs]`. Tasks with no shared dependencies can run in parallel.

---

## Layer 0 — Foundation

### T1: Project Skeleton ✅
- **Description:** Initialize the project structure. Package.json, TypeScript config, Vite setup (for dev server + build), folder structure (`src/core/`, `src/editor/`, `src/viewer/`, `src/server/`), basic dev scripts (`dev`, `build`, `test`). Install dependencies: Leaflet, Vite, Vitest, sharp (image resizing).
- **Output:** A runnable project that serves an empty page on `npm run dev`.
- **Depends on:** []

### T2: Shared Type Definitions ✅
- **Description:** Define the TypeScript interfaces that form the contract between modules: `Trackpoint`, `RouteSegment` (with `isGap` flag), `PhotoMetadata`, `PlacedPhoto`, `PhotoCluster`, `ActivityData`. These are the data shapes that flow between modules.
- **Output:** `src/core/types.ts`
- **Depends on:** [T1]

---

## Layer 1 — Pure Data Modules (parallelizable)

### T3: GPX Parser
- **Description:** Implement `parseGPX(gpxString: string): { trackpoints: Trackpoint[], segments: RouteSegment[] }`. Parse XML, extract trackpoints, detect gaps (>60s between consecutive points), return segments marked as normal or gap.
- **Output:** `src/core/gpx-parser.ts`
- **Depends on:** [T2]

### T4: GPX Parser Tests
- **Description:** Unit tests for GPX Parser. Cases: valid GPX with multiple tracks, single point, large time gaps, empty file, malformed XML, timezone variations.
- **Output:** `src/core/gpx-parser.test.ts`
- **Depends on:** [T3]

### T5: Photo-Route Matcher
- **Description:** Implement `matchPhotosToRoute(trackpoints: Trackpoint[], photos: PhotoMetadata[], bufferMinutes: number): { placed: PlacedPhoto[], unplaced: PhotoMetadata[] }`. Strategy: GPS-first, nearest-trackpoint-snap fallback. Edge photos (within buffer but outside GPX range) snap to nearest endpoint.
- **Output:** `src/core/photo-route-matcher.ts`
- **Depends on:** [T2]

### T6: Photo-Route Matcher Tests
- **Description:** Unit tests. Cases: photo with GPS, photo without GPS (timestamp snap), photo outside range but within buffer (edge photo), photo completely outside range (unplaced), all photos at same timestamp, photos during a gap segment.
- **Output:** `src/core/photo-route-matcher.test.ts`
- **Depends on:** [T5]

### T7: Photo Clusterer
- **Description:** Implement `clusterPhotos(photos: PlacedPhoto[], windowSeconds: number): PhotoCluster[]`. Groups placed photos within the time window. Each cluster has a `heroIndex` (default 0) and a `photos` array.
- **Output:** `src/core/photo-clusterer.ts`
- **Depends on:** [T2]

### T8: Photo Clusterer Tests
- **Description:** Unit tests. Cases: no photos, single photo (cluster of 1), burst of photos within window, photos spread across multiple clusters, exact boundary (30s apart).
- **Output:** `src/core/photo-clusterer.test.ts`
- **Depends on:** [T7]

---

## Layer 2 — Map Rendering Core

### T9: Map Renderer — Route
- **Description:** Leaflet component that draws the route polyline. Solid lines for normal segments, dashed for gaps. Layer switcher between OpenTopoMap (default) and Esri satellite. Auto-fits bounds to the route.
- **Output:** `src/core/map/route-layer.ts`
- **Depends on:** [T2, T1]

### T10: Map Renderer — Photo Markers
- **Description:** Leaflet layer that places rectangular thumbnail markers on the map. Cluster badges with count. Handles marker scaling on hover. Click opens lightbox.
- **Output:** `src/core/map/photo-markers.ts`
- **Depends on:** [T2, T1]

### T11: Filmstrip Component
- **Description:** Dark horizontal strip at the bottom showing photo thumbnails in chronological order. Scroll/scrub behavior. Hover triggers map pan + marker highlight. Click triggers lightbox. Cluster expansion (fan-out thumbnails on cluster click).
- **Output:** `src/core/filmstrip/filmstrip.ts`
- **Depends on:** [T2, T1]

### T12: Lightbox Component
- **Description:** Full-screen overlay showing display-resolution photo. Close button, keyboard navigation (left/right arrows to move between photos), swipe on mobile. Lazy-loads the display-res image on open.
- **Output:** `src/core/lightbox/lightbox.ts`
- **Depends on:** [T2, T1]

---

## Layer 3 — Entry Points

### T13: Viewer Entry Point
- **Description:** `viewer.html` + `src/viewer/main.ts`. Loads activity data from a JSON file, initializes Map Renderer (route + markers), filmstrip, and lightbox. Read-only — no editing controls. This is the exported artifact.
- **Output:** `src/viewer/`
- **Depends on:** [T9, T10, T11, T12]

### T14: Editor Entry Point
- **Description:** `editor.html` + `src/editor/main.ts`. Same as viewer but adds Editor Controls: deselect/reselect photos, pick hero from cluster, import GPX (triggers pipeline), and export button.
- **Output:** `src/editor/`
- **Depends on:** [T13, T15]

### T15: Editor Controls
- **Description:** Toolbar UI overlay. Photo deselection (click to toggle), hero picker (within expanded cluster), GPX drop zone, export button. Communicates state changes to the shared core.
- **Output:** `src/editor/controls/`
- **Depends on:** [T9, T10, T11, T12]

---

## Layer 4 — Server & Bridge

### T16: Local Dev Server
- **Description:** Node.js/Express server that serves the editor, handles API routes for the Photos Bridge and Static Exporter. Routes: `POST /api/import-gpx`, `GET /api/photos`, `POST /api/export`.
- **Output:** `src/server/index.ts`
- **Depends on:** [T1]

### T17: Photos Bridge
- **Description:** Implement the osascript/JXA integration. Given a time range (±10 min buffer), query Apple Photos, return metadata (GPS, timestamp, asset ID), export matching photos to a temp directory. Graceful failure with clear error messages (permission denied, no photos found).
- **Output:** `src/server/photos-bridge.ts`
- **Depends on:** [T16, T2]

### T18: Photos Bridge — Drag-and-Drop Fallback
- **Description:** API endpoint that accepts manually dropped photo files. Reads EXIF metadata (GPS, timestamp) from the files using a library (e.g., `exif-reader` or `sharp` metadata). Returns same `PhotoMetadata[]` shape as the Photos Bridge.
- **Output:** `src/server/photos-manual.ts`
- **Depends on:** [T16, T2]

---

## Layer 5 — Static Exporter

### T19: Image Resizer
- **Description:** Given a source photo, produce two outputs: thumbnail (~200px) and display resolution (~1600px wide). Uses `sharp`. Returns paths to the generated files.
- **Output:** `src/server/image-resizer.ts`
- **Depends on:** [T1]

### T20: Image Resizer Tests
- **Description:** Unit tests. Cases: landscape photo, portrait photo, already-small photo (no upscaling), various input formats (JPEG, HEIC, PNG).
- **Output:** `src/server/image-resizer.test.ts`
- **Depends on:** [T19]

### T21: Static Exporter
- **Description:** Takes curated activity state (selected photos, clusters with hero picks, route segments) and produces a self-contained folder: `viewer.html`, JS/CSS bundle, `activity.json` (route + photo placement data), resized photos in `photos/` (thumbs + display). Copies the viewer build output and generates the data file.
- **Output:** `src/server/static-exporter.ts`
- **Depends on:** [T13, T19, T7, T5]

### T22: Static Exporter Tests
- **Description:** Integration tests. Given sample activity data and photos, assert: correct folder structure, `activity.json` schema, thumbnail and display images exist at expected sizes, HTML file is self-contained (no external URLs except tile servers).
- **Output:** `src/server/static-exporter.test.ts`
- **Depends on:** [T21]

---

## Layer 6 — Integration

### T23: End-to-End Pipeline
- **Description:** Wire everything together in the server. GPX upload → parse → Photos Bridge query → match → cluster → serve to editor. Export button → Static Exporter → download zip or output folder.
- **Output:** `src/server/pipeline.ts`
- **Depends on:** [T3, T5, T7, T17, T18, T21, T14]

### T24: Visual Integration Test
- **Description:** Load a sample GPX + photos via the local server, verify the editor and viewer render correctly. Provide sample test fixtures (a GPX file + a few geotagged photos) and document how to run the visual check.
- **Output:** `tests/integration/` + `tests/fixtures/`
- **Depends on:** [T23]

---

## DAG Summary (dependency graph)

```
T1 ─────────────────────────────────────────────────────────────────────
│
T2 ─────────────────────────────────────────────────────────────────────
│               │               │               │
T3              T5              T7              T9, T10, T11, T12
│               │               │               │
T4              T6              T8              T13 ──────────┐
                                                │             │
                                                T15 ──────── T14
                                                              │
T16 ────────────────────────────────────────────              │
│               │                                             │
T17             T18                                           │
                                                              │
T19 ────────────────────────────────────────────              │
│                                                             │
T20                                                           │
│                                                             │
T21 ──────────────────────────────────────────────────────────┘
│
T22
│
T23
│
T24
```

## Parallelization Opportunities

| Phase | Tasks that can run in parallel |
|-------|-------------------------------|
| After T2 | T3, T5, T7, T9, T10, T11, T12 (all independent) |
| After T3/T5/T7 | T4, T6, T8 (tests, independent) |
| After T1 | T16, T19 (server + image resizer, no type deps) |
| After T16 | T17, T18 (both bridge implementations) |
| After T9-T12 | T13, T15 (viewer + editor controls) |
