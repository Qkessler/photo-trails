# PRD: Photos on Trails

## Problem Statement

When I go on a hike or run, I track my route with a Garmin watch and take photos with my iPhone. Afterwards, there's no easy way to see *where on the trail* each photo was taken. The route data and the photos live in separate silos — I can't visualize the relationship between them without tedious manual effort.

## Solution

A local web app that takes a GPX file, automatically finds matching photos from Apple Photos, and renders an interactive map showing the route with photo markers pinned along it. After curating (deselecting unwanted photos, picking favorites from clusters), I can export a self-contained static page to host on my personal website and share with others.

## User Stories

1. As a hiker, I want to drag-and-drop a GPX file into the app, so that my route is displayed on a map immediately.
2. As a hiker, I want the app to automatically find photos I took during the activity from Apple Photos, so that I don't have to manually select or export them.
3. As a hiker, I want photos placed on the map at the location where they were taken (using their GPS coordinates), so that I can see exactly where each photo happened on the trail.
4. As a hiker, I want photos without GPS data to be placed on the route by matching their timestamp to the nearest trackpoint, so that signal-loss doesn't leave photos unplaced.
5. As a hiker, I want to see photos that can't be placed at all marked as "unplaced," so that I know which ones need manual attention.
6. As a hiker, I want photos taken within a short time window (e.g., 30 seconds) grouped into a single marker with a count badge, so that the map isn't cluttered when I take multiple shots at one spot.
7. As a hiker, I want to tap a cluster marker to expand and browse all photos in that cluster, so that I can see everything I shot at that location.
8. As a hiker, I want to pick a "hero photo" from a cluster to represent it on the map, so that the most interesting shot is visible at a glance.
9. As a hiker, I want to deselect photos I don't want included, so that the final output only shows my best work.
10. As a hiker, I want to toggle between terrain (topographic) and satellite map layers, so that I can see the trail in the context that's most useful.
11. As a hiker, I want GPS track gaps shown as dashed lines, so that I can tell where signal was lost without the route looking broken.
12. As a hiker, I want to export the curated map as a self-contained static folder (HTML + photos + route data), so that I can host it on my personal website.
13. As a viewer (someone I shared with), I want to open a URL and see the interactive map with photos, so that I can explore the hike without installing anything.
14. As a viewer, I want to tap a photo marker and see a larger version of the image, so that I can appreciate the photo in detail.
15. As a viewer, I want the page to load quickly even with many photos, so that the experience isn't frustrating on slower connections.
16. As a hiker, I want thumbnails used on the map and display-resolution images for the detail view, so that the page stays fast while photos still look good.
17. As a hiker, I want to preview the shared view locally before publishing, so that I know exactly what others will see.
18. As a hiker, I want the editor view and shared view to look identical (minus editing controls), so that there are no surprises after publishing.

## Implementation Decisions

### Modules

1. **GPX Parser** — Reads a GPX file and extracts an ordered list of trackpoints (latitude, longitude, timestamp). Detects gaps where consecutive points are separated by more than a time threshold (e.g., 60 seconds) and marks those segments as gaps. Pure function, no side effects.

2. **Photos Bridge** — Node.js server component that uses `osascript` with JXA (JavaScript for Automation) to query Apple Photos by date range (GPX time range ±10 minute buffer). Returns photo metadata (GPS coordinates, timestamp, asset ID) and exports photo files to a working directory. This is the "magic" layer that eliminates manual photo selection. If the bridge fails (permissions, Photos not available), the app falls back to manual drag-and-drop import.

3. **Photo-Route Matcher** — Takes trackpoints and photo metadata, produces Placed Photos. Placement strategy: (1) use photo's own GPS coordinates if available, (2) snap to nearest trackpoint by timestamp, (3) mark as Unplaced. Photos within the ±10 minute buffer but outside the GPX time range are snapped to the nearest route endpoint (Edge Photos). Pure function.

4. **Photo Clusterer** — Takes Placed Photos and groups them by temporal proximity (30-second window). Produces Photo Clusters with a default hero (first photo). Pure function, independent of placement logic.

5. **Map Renderer** — Leaflet-based component that draws the route as a polyline (solid for normal segments, dashed for gaps), places rectangular photo markers (thumbnails with white outline, cluster badges), a dark horizontal filmstrip at the bottom, and provides a layer switcher between OpenTopoMap (terrain, default) and Esri (satellite). No API keys required. Interaction model: hover filmstrip → pan map + scale marker; click photo → lightbox; click cluster badge → expand in filmstrip + zoom map.

6. **Editor Controls** — Toolbar overlay on the Map Renderer for the local web app. Provides: deselect/reselect photos, pick hero from cluster, trigger export.

7. **Static Exporter** — Takes the curated state (selected photos, hero picks, route data) and produces a deployable folder. Resizes photos to two sizes (thumbnail ~200px for markers, display ~1600px for detail view). Outputs HTML + JS + CSS + images + route JSON. Fully self-contained, no external dependencies at runtime. Photos are lazy-loaded (thumbnails upfront, display-res on demand).

### Architecture

- **Local web app** served by a Node.js server (handles Photos Bridge + file operations).
- **Shared view** is pure static files — no server needed to view.
- **Two entry points, shared core:** `viewer.html` is the exported artifact as-is (read-only). `editor.html` imports the same core rendering modules and wraps them with editing controls. No build-time stripping needed — the exporter copies the viewer + core + assets.

### Map Stack

- Leaflet (rendering) + OpenTopoMap tiles (terrain default) + Esri satellite tiles (toggle). All free, no API keys.

### Photo Sizing

- Two exported sizes per photo: thumbnail (~200px) and display resolution (~1600px wide).
- Originals are not included in the export.

### Route Gap Detection

- Consecutive trackpoints with time delta exceeding a threshold (e.g., 60 seconds) are rendered as dashed line segments.

## Testing Decisions

### Philosophy

Test external behavior through module interfaces — given these inputs, assert these outputs. Don't test internal implementation details.

### Unit-Testable Modules

- **GPX Parser** — given a GPX string, assert correct trackpoints and gap detection. Edge cases: empty files, single point, large gaps, timezone handling.
- **Photo-Route Matcher** — given trackpoints and photo metadata, assert correct placement (GPS, interpolation, unplaced) and clustering. Edge cases: photos outside route time range, all photos at same timestamp, photos in gaps.
- **Static Exporter** — given curated state, assert correct folder structure and file output. Assert thumbnail and display-size images are generated.

### Integration / Visual Testing

- **Load the pages via the local server** and verify visually that the map renders correctly, markers appear in the right places, clusters expand, layer switching works, and the shared view matches the editor view.
- The local dev server serves as the integration test harness — what you see is what you ship.

### Not Tested in Isolation

- **Photos Bridge** — depends on macOS and Apple Photos. Validated manually or via integration tests on a real system.
- **Map Renderer** — DOM/canvas dependent. Validated visually through the local server.

## Out of Scope

- Native mobile app
- Multi-activity library / history view (future evolution)
- Automatic "best photo" selection (AI-based quality scoring)
- Real-time tracking / live view
- Elevation profile visualization
- Social media export formatting
- User accounts or authentication
- Cloud hosting or backend infrastructure

## Further Notes

- The creation workflow runs entirely on macOS (due to Apple Photos dependency via osascript/JXA).
- The shared output is platform-agnostic — any browser, any device.
- Future evolution could add a library of past activities, but the MVP focuses on single-activity flow: import → curate → export → share.
