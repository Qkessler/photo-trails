# Visual Integration Test

Verifies the full pipeline (GPX → photo matching → export) produces a working viewer.

## Running the automated checks

```bash
npx vitest run tests/integration/visual.test.ts
```

This imports a sample GPX route + 3 test photos through the pipeline and asserts:
- Route segments parse correctly (15 trackpoints, gap detection)
- Photos are placed into clusters along the route
- Exported folder has the correct structure (`viewer.html`, `activity.json`, resized photos)
- The viewer HTML is self-contained (no external URLs except tile servers)

## Manual visual inspection

1. Start the dev server:

```bash
npm run dev:server
```

2. Import the fixture GPX + photos via curl:

```bash
curl -X POST http://localhost:3000/api/import-gpx \
  -F "gpx=@tests/fixtures/sample-route.gpx" \
  -F "photos=@tests/fixtures/photo-start.jpg" \
  -F "photos=@tests/fixtures/photo-midway.jpg" \
  -F "photos=@tests/fixtures/photo-end.jpg"
```

3. Open the editor in a browser:

```
http://localhost:3000/editor.html
```

4. Verify visually:
   - Route polyline renders on the map (San Francisco area, ~1km trail)
   - 3 photo markers appear along the route
   - Filmstrip at bottom shows 3 thumbnails in chronological order
   - Clicking a thumbnail opens the lightbox
   - No console errors

5. Export and check the viewer:

```bash
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"outputDir": "/tmp/photos-on-trails-visual-check"}'
```

Then open `/tmp/photos-on-trails-visual-check/viewer.html` directly in a browser (or via a simple HTTP server) to confirm the static viewer works independently.

## Regenerating fixture photos

The test photos are simple colored rectangles (800×600). To regenerate:

```bash
npx tsx tests/fixtures/generate-photos.ts
```

These photos don't have embedded EXIF GPS—they rely on the timestamp-snap placement strategy since the server's manual-upload path reads EXIF from the files. The photos' timestamps are matched to the GPX timerange by the pipeline's buffer window.

## Test fixtures

| File | Description |
|------|-------------|
| `sample-route.gpx` | 15-point trail in San Francisco, ~15 min, with a 2-min gap |
| `photo-start.jpg` | Green rectangle, timestamp at 10:01:30 |
| `photo-midway.jpg` | Blue rectangle, timestamp at 10:05:15 |
| `photo-end.jpg` | Orange rectangle, timestamp at 10:13:30 |
