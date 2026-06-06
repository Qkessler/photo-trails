# Photos on Trails

Drop a GPX file from your Garmin. See your photos pinned to the trail on a satellite map. Export a self-contained page to share with anyone.

## Quick Start

```bash
npm install
just dev
```

Open http://localhost:3000. Drop your GPX file. The app finds matching photos from Apple Photos automatically.

No `just`? Run both commands manually:

```bash
PORT=3001 npx tsx --watch src/server/index.ts &
npx vite
```

## Requirements

- macOS (Apple Photos integration requires osascript)
- Node.js 18+
- A GPX file from your Garmin (or any GPS tracker)

On first run, macOS will ask you to grant automation access. Go to System Settings → Privacy & Security → Automation and allow your terminal to control Photos.

## How It Works

You drop a GPX file. The app reads the start and end timestamps, queries Apple Photos for all photos taken in that window (±10 minutes), and places each photo on the map using its GPS coordinates. Photos without GPS get snapped to the nearest trackpoint by timestamp.

Photos taken in quick succession (within 30 seconds) get clustered into a single marker with a count badge. Hover any thumbnail in the filmstrip to pan the map. Click to open a lightbox.

No Apple Photos? Drop photos alongside the GPX file instead. The app reads EXIF data directly.

## Export

Click Export in the editor to generate a self-contained folder: HTML, JS, CSS, resized photos, and route data. Host it anywhere — no server needed. Viewers open it in any browser.

## Commands

| Command | What it does |
|---------|-------------|
| `just dev` | Start the full app (clears ports, runs API + frontend) |
| `just test` | Run all tests |
| `just build` | Production build |
| `just clean-ports` | Kill processes on ports 3000/3001 |

## Project Structure

```
src/
├── core/           Shared rendering + data modules (GPX parser, matcher, clusterer, map, filmstrip, lightbox)
├── editor/         Editor entry point + controls (deselect photos, pick heroes, export)
├── viewer/         Viewer entry point (read-only, used in exports)
└── server/         Express API (Photos Bridge, image resizer, static exporter, pipeline)
```
