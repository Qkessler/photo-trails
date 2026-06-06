import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { exportStatic, buildActivityJson } from "./static-exporter";
import type { ActivityData } from "@core/types";
import { createTestJpeg, createTestPortrait } from "../../tests/fixtures/create-test-image";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

function makeActivity(filenames: string[]): ActivityData {
  return {
    segments: [
      {
        isGap: false,
        points: [
          { lat: 47.6, lng: -122.3, timestamp: 1000, ele: 100 },
          { lat: 47.61, lng: -122.31, timestamp: 2000, ele: 110 },
        ],
      },
      {
        isGap: true,
        points: [
          { lat: 47.61, lng: -122.31, timestamp: 2000, ele: 110 },
          { lat: 47.62, lng: -122.32, timestamp: 5000, ele: 120 },
        ],
      },
    ],
    clusters: [
      {
        heroIndex: 0,
        lat: 47.6,
        lng: -122.3,
        timestamp: 1000,
        photos: filenames.map((filename, i) => ({
          photo: {
            id: `photo-${i}`,
            filename,
            timestamp: 1000 + i * 100,
            lat: 47.6,
            lng: -122.3,
          },
          lat: 47.6,
          lng: -122.3,
          routeTimestamp: 1000 + i * 100,
          placementMethod: "gps" as const,
        })),
      },
    ],
    unplaced: [{ id: "orphan", filename: "lost.jpg", timestamp: null, lat: null, lng: null }],
  };
}

// --- Unit tests for buildActivityJson ---

describe("buildActivityJson", () => {
  it("rewrites photo URLs to relative thumb/display paths", () => {
    const result = buildActivityJson(makeActivity(["sunset.jpg"]), "photos");

    const photo = result.clusters[0].photos[0].photo as unknown as Record<string, unknown>;
    expect(photo.thumbnailUrl).toBe("photos/sunset_thumb.jpg");
    expect(photo.displayUrl).toBe("photos/sunset_display.jpg");
  });

  it("strips nested extensions correctly (HEIC, PNG)", () => {
    const result = buildActivityJson(makeActivity(["IMG_0042.HEIC", "trail.png"]), "photos");

    const photos = result.clusters[0].photos.map((p) => p.photo as unknown as Record<string, unknown>);
    expect(photos[0].thumbnailUrl).toBe("photos/IMG_0042_thumb.jpg");
    expect(photos[0].displayUrl).toBe("photos/IMG_0042_display.jpg");
    expect(photos[1].thumbnailUrl).toBe("photos/trail_thumb.jpg");
    expect(photos[1].displayUrl).toBe("photos/trail_display.jpg");
  });

  it("preserves segments and unplaced photos unchanged", () => {
    const input = makeActivity(["a.jpg"]);
    const result = buildActivityJson(input, "photos");

    expect(result.segments).toEqual(input.segments);
    expect(result.unplaced).toEqual(input.unplaced);
  });

  it("preserves cluster metadata (heroIndex, lat, lng, timestamp)", () => {
    const input = makeActivity(["a.jpg", "b.jpg"]);
    input.clusters[0].heroIndex = 1;
    const result = buildActivityJson(input, "photos");

    expect(result.clusters[0].heroIndex).toBe(1);
    expect(result.clusters[0].lat).toBe(47.6);
    expect(result.clusters[0].lng).toBe(-122.3);
    expect(result.clusters[0].timestamp).toBe(1000);
  });

  it("does not mutate the original activity", () => {
    const input = makeActivity(["photo.jpg"]);
    const originalFilename = input.clusters[0].photos[0].photo.filename;
    buildActivityJson(input, "photos");

    expect(input.clusters[0].photos[0].photo.filename).toBe(originalFilename);
    expect(
      (input.clusters[0].photos[0].photo as unknown as Record<string, unknown>).thumbnailUrl,
    ).toBeUndefined();
  });
});

// --- Integration tests for exportStatic ---

describe("exportStatic integration", () => {
  let tmpDir: string;
  let photoSourceDir: string;
  let outputDir: string;
  let distDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "static-exporter-test-"));
    photoSourceDir = path.join(tmpDir, "source-photos");
    outputDir = path.join(tmpDir, "output");

    await fs.mkdir(photoSourceDir, { recursive: true });

    await createTestJpeg(path.join(photoSourceDir, "landscape.jpg"), 3000, 2000);
    await createTestPortrait(path.join(photoSourceDir, "portrait.jpg"));
    await createTestJpeg(path.join(photoSourceDir, "small.jpg"), 150, 100);

    distDir = path.join(PROJECT_ROOT, "dist");
    await fs.mkdir(distDir, { recursive: true });
    await fs.writeFile(
      path.join(distDir, "viewer.html"),
      `<!DOCTYPE html><html><head><title>Viewer</title></head><body><div id="app"></div><script type="module" src="./assets/viewer.js"></script></body></html>`,
    );
    await fs.mkdir(path.join(distDir, "assets"), { recursive: true });
    await fs.writeFile(path.join(distDir, "assets", "viewer.js"), "// viewer bundle");
    await fs.writeFile(path.join(distDir, "assets", "viewer.css"), "/* styles */");
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.rm(distDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  });

  it("produces correct folder structure", async () => {
    const activity = makeActivity(["landscape.jpg", "portrait.jpg"]);

    const result = await exportStatic({ activity, photoSourceDir, outputDir });

    const topLevel = await fs.readdir(result.outputDir);
    expect(topLevel).toContain("photos");
    expect(topLevel).toContain("activity.json");
    expect(topLevel).toContain("viewer.html");
  });

  it("writes valid activity.json with required schema fields", async () => {
    const activity = makeActivity(["landscape.jpg"]);
    const result = await exportStatic({ activity, photoSourceDir, outputDir });

    const raw = await fs.readFile(result.activityJsonPath, "utf-8");
    const data = JSON.parse(raw) as ActivityData;

    expect(data.segments).toBeDefined();
    expect(Array.isArray(data.segments)).toBe(true);
    expect(data.segments.length).toBeGreaterThan(0);
    expect(data.segments[0]).toHaveProperty("points");
    expect(data.segments[0]).toHaveProperty("isGap");

    expect(data.clusters).toBeDefined();
    expect(Array.isArray(data.clusters)).toBe(true);
    expect(data.clusters[0]).toHaveProperty("heroIndex");
    expect(data.clusters[0]).toHaveProperty("photos");
    expect(data.clusters[0]).toHaveProperty("lat");
    expect(data.clusters[0]).toHaveProperty("lng");
    expect(data.clusters[0]).toHaveProperty("timestamp");

    const photo = data.clusters[0].photos[0].photo as unknown as Record<string, unknown>;
    expect(photo.thumbnailUrl).toMatch(/^photos\/.*_thumb\.jpg$/);
    expect(photo.displayUrl).toMatch(/^photos\/.*_display\.jpg$/);

    expect(data.unplaced).toBeDefined();
    expect(Array.isArray(data.unplaced)).toBe(true);
  });

  it("generates thumbnail and display images at expected sizes", async () => {
    const activity = makeActivity(["landscape.jpg", "portrait.jpg"]);
    await exportStatic({ activity, photoSourceDir, outputDir });

    const photosDir = path.join(outputDir, "photos");

    const thumbMeta = await sharp(path.join(photosDir, "landscape_thumb.jpg")).metadata();
    expect(thumbMeta.width).toBe(200);
    expect(thumbMeta.format).toBe("jpeg");

    const displayMeta = await sharp(path.join(photosDir, "landscape_display.jpg")).metadata();
    expect(displayMeta.width).toBe(1600);
    expect(displayMeta.format).toBe("jpeg");

    const portraitThumb = await sharp(path.join(photosDir, "portrait_thumb.jpg")).metadata();
    expect(portraitThumb.height).toBeGreaterThan(portraitThumb.width!);

    const portraitDisplay = await sharp(path.join(photosDir, "portrait_display.jpg")).metadata();
    expect(portraitDisplay.width).toBe(1600);
  });

  it("does not upscale small images", async () => {
    const activity = makeActivity(["small.jpg"]);
    await exportStatic({ activity, photoSourceDir, outputDir });

    const photosDir = path.join(outputDir, "photos");
    const thumbMeta = await sharp(path.join(photosDir, "small_thumb.jpg")).metadata();
    expect(thumbMeta.width).toBe(150);

    const displayMeta = await sharp(path.join(photosDir, "small_display.jpg")).metadata();
    expect(displayMeta.width).toBe(150);
  });

  it("returns correct photo count", async () => {
    const activity = makeActivity(["landscape.jpg", "portrait.jpg", "small.jpg"]);
    const result = await exportStatic({ activity, photoSourceDir, outputDir });
    expect(result.photoCount).toBe(3);
  });

  it("skips missing source photos gracefully", async () => {
    const activity = makeActivity(["landscape.jpg", "nonexistent.jpg"]);
    const result = await exportStatic({ activity, photoSourceDir, outputDir });
    expect(result.photoCount).toBe(1);
  });

  it("viewer HTML is self-contained (no external URLs except tile servers)", async () => {
    const activity = makeActivity(["landscape.jpg"]);
    await exportStatic({ activity, photoSourceDir, outputDir });

    const htmlPath = path.join(outputDir, "viewer.html");
    const html = await fs.readFile(htmlPath, "utf-8");

    const urlPattern = /https?:\/\/[^\s"'<>]+/g;
    const urls = html.match(urlPattern) ?? [];

    const allowedHosts = [
      "tile.opentopomap.org",
      "server.arcgisonline.com",
      "{s}.tile.opentopomap.org",
      "unpkg.com",
      "cdn.jsdelivr.net",
    ];

    const externalUrls = urls.filter((url) => {
      return !allowedHosts.some((host) => url.includes(host));
    });

    expect(externalUrls).toEqual([]);
  });
});
