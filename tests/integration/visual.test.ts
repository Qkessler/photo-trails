import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { parseGPX } from "../../src/core/gpx-parser.js";
import { matchPhotosToRoute } from "../../src/core/photo-route-matcher.js";
import { clusterPhotos } from "../../src/core/photo-clusterer.js";
import { extractMetadata } from "../../src/server/photos-manual.js";
import { resizeImage } from "../../src/server/image-resizer.js";
import { buildActivityJson } from "../../src/server/static-exporter.js";
import type { ActivityData, PhotoMetadata } from "../../src/core/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

const BUFFER_MINUTES = 10;
const CLUSTER_WINDOW_SECONDS = 30;

describe("Visual Integration Test — Pipeline", () => {
  let activity: ActivityData;
  let photos: PhotoMetadata[];
  let outputDir: string;

  beforeAll(async () => {
    const gpxString = await fs.readFile(path.join(FIXTURES_DIR, "sample-route.gpx"), "utf-8");
    const { trackpoints, segments } = parseGPX(gpxString);

    const photoFilenames = ["photo-start.jpg", "photo-midway.jpg", "photo-end.jpg"];
    photos = await Promise.all(
      photoFilenames.map(async (filename) => {
        const buffer = await fs.readFile(path.join(FIXTURES_DIR, filename));
        return extractMetadata(buffer, filename);
      }),
    );

    const { placed, unplaced } = matchPhotosToRoute(trackpoints, photos, BUFFER_MINUTES);
    const clusters = clusterPhotos(placed, CLUSTER_WINDOW_SECONDS);
    activity = { segments, clusters, unplaced };

    outputDir = path.join(os.tmpdir(), `photos-on-trails-integration-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
  });

  it("parses trackpoints from the fixture GPX", () => {
    const totalPoints = activity.segments.reduce((sum, s) => sum + s.points.length, 0);
    expect(totalPoints).toBeGreaterThanOrEqual(15);
  });

  it("detects at least one route segment", () => {
    expect(activity.segments.length).toBeGreaterThan(0);
  });

  it("places all 3 photos into clusters", () => {
    const placedCount = activity.clusters.reduce((sum, c) => sum + c.photos.length, 0);
    expect(placedCount).toBe(3);
    expect(activity.unplaced.length).toBe(0);
  });

  it("photos are placed using a valid strategy", () => {
    const allPlaced = activity.clusters.flatMap((c) => c.photos);
    for (const placed of allPlaced) {
      expect(["gps", "timestamp-snap", "edge-snap"]).toContain(placed.placementMethod);
    }
  });

  it("clusters have valid lat/lng coordinates on the route", () => {
    for (const cluster of activity.clusters) {
      expect(cluster.lat).toBeGreaterThan(37);
      expect(cluster.lat).toBeLessThan(38);
      expect(cluster.lng).toBeGreaterThan(-123);
      expect(cluster.lng).toBeLessThan(-122);
    }
  });

  it("resizes photos to thumb + display sizes", async () => {
    const photosDir = path.join(outputDir, "photos");
    await fs.mkdir(photosDir, { recursive: true });

    const sourcePath = path.join(FIXTURES_DIR, "photo-start.jpg");
    await resizeImage(sourcePath, { outputDir: photosDir });

    const files = await fs.readdir(photosDir);
    const thumbs = files.filter((f) => f.includes("_thumb"));
    const displays = files.filter((f) => f.includes("_display"));

    expect(thumbs.length).toBe(1);
    expect(displays.length).toBe(1);
  });

  it("buildActivityJson produces correct photo URL structure", () => {
    const photosDir = path.join(outputDir, "photos");
    const exportData = buildActivityJson(activity, photosDir);

    expect(exportData.segments).toEqual(activity.segments);
    expect(exportData.clusters.length).toBe(activity.clusters.length);

    const firstPhoto = exportData.clusters[0].photos[0].photo as Record<string, unknown>;
    expect(firstPhoto.thumbnailUrl).toMatch(/^photos\/.*_thumb\.jpg$/);
    expect(firstPhoto.displayUrl).toMatch(/^photos\/.*_display\.jpg$/);
  });
});

describe("Visual Integration Test — Server API", () => {
  it("import-gpx endpoint processes fixture data", async () => {
    const { app } = await import("../../src/server/index.js");

    const FormData = (await import("node:buffer")).Buffer;
    const gpxBuffer = await fs.readFile(path.join(FIXTURES_DIR, "sample-route.gpx"));
    const photoBuffers = await Promise.all(
      ["photo-start.jpg", "photo-midway.jpg", "photo-end.jpg"].map((f) =>
        fs.readFile(path.join(FIXTURES_DIR, f)),
      ),
    );

    const boundary = "----TestBoundary" + Date.now();
    const parts: Buffer[] = [];

    function addPart(fieldName: string, buffer: Buffer, filename: string, contentType: string) {
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
      parts.push(Buffer.from(header));
      parts.push(buffer);
      parts.push(Buffer.from("\r\n"));
    }

    addPart("gpx", gpxBuffer, "sample-route.gpx", "application/gpx+xml");
    ["photo-start.jpg", "photo-midway.jpg", "photo-end.jpg"].forEach((name, i) => {
      addPart("photos", photoBuffers[i], name, "image/jpeg");
    });
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const response = await new Promise<{ status: number; body: Record<string, unknown> }>((resolve) => {
      const http = require("node:http");
      const server = app.listen(0, () => {
        const port = (server.address() as { port: number }).port;
        const req = http.request(
          { hostname: "127.0.0.1", port, path: "/api/import-gpx", method: "POST", headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length } },
          (res: any) => {
            let data = "";
            res.on("data", (chunk: string) => (data += chunk));
            res.on("end", () => {
              server.close();
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            });
          },
        );
        req.write(body);
        req.end();
      });
    });

    expect(response.status).toBe(200);
    expect(response.body.photoSource).toBe("manual-fallback");
    const act = response.body.activity as ActivityData;
    expect(act.clusters.length).toBeGreaterThan(0);
  });
});
