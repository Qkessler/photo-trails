import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryPhotos, PhotosBridgeError, buildJXAScript } from "./photos-bridge.js";
import type { PhotosBridgeOptions, OsascriptRunner } from "./photos-bridge.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    mkdtemp: vi.fn().mockResolvedValue("/tmp/photos-on-trails-abc123"),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

const baseOptions: PhotosBridgeOptions = {
  startTime: new Date("2024-06-01T08:00:00Z").getTime(),
  endTime: new Date("2024-06-01T18:00:00Z").getTime(),
  exportDir: "/tmp/test-export",
};

function fakeRunner(stdout: string): OsascriptRunner {
  return vi.fn().mockResolvedValue(stdout);
}

function failingRunner(error: Error): OsascriptRunner {
  return vi.fn().mockRejectedValue(error);
}

describe("Photos Bridge", () => {
  it("returns photos when JXA script succeeds", async () => {
    const jxaOutput = JSON.stringify({
      photos: [
        { id: "ABC123", filename: "IMG_001.jpg", timestamp: 1717232400000, lat: 47.6, lng: -122.3, width: 4032, height: 3024 },
        { id: "DEF456", filename: "IMG_002.jpg", timestamp: 1717236000000, lat: null, lng: null, width: 3024, height: 4032 },
      ],
    });

    const result = await queryPhotos(baseOptions, fakeRunner(jxaOutput));

    expect(result.photos).toHaveLength(2);
    expect(result.photos[0]).toEqual({
      id: "ABC123",
      filename: "IMG_001.jpg",
      timestamp: 1717232400000,
      lat: 47.6,
      lng: -122.3,
      width: 4032,
      height: 3024,
    });
    expect(result.photos[1].lat).toBeNull();
    expect(result.photos[1].lng).toBeNull();
    expect(result.exportDir).toBe("/tmp/test-export");
  });

  it("throws NO_PHOTOS when no photos match the range", async () => {
    const jxaOutput = JSON.stringify({ error: "no_photos", message: "No photos found in the specified time range." });

    await expect(queryPhotos(baseOptions, fakeRunner(jxaOutput))).rejects.toMatchObject({
      code: "NO_PHOTOS",
    });
  });

  it("throws PERMISSION_DENIED when Photos access is blocked", async () => {
    const error = new PhotosBridgeError(
      "Photos access denied.",
      "PERMISSION_DENIED",
    );

    await expect(queryPhotos(baseOptions, failingRunner(error))).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });

  it("throws OSASCRIPT_FAILED for unexpected errors", async () => {
    const error = new Error("something unexpected");

    await expect(queryPhotos(baseOptions, failingRunner(error))).rejects.toMatchObject({
      code: "OSASCRIPT_FAILED",
    });
  });

  it("throws OSASCRIPT_FAILED when output is not valid JSON", async () => {
    await expect(queryPhotos(baseOptions, fakeRunner("not json at all"))).rejects.toMatchObject({
      code: "OSASCRIPT_FAILED",
    });
  });

  it("handles permission_denied in JXA output", async () => {
    const jxaOutput = JSON.stringify({ error: "permission_denied", message: "Cannot access Photos." });

    await expect(queryPhotos(baseOptions, fakeRunner(jxaOutput))).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });

  it("uses default 10-minute buffer when not specified", async () => {
    const jxaOutput = JSON.stringify({
      photos: [{ id: "X", filename: "f.jpg", timestamp: 1717232400000, lat: 1, lng: 2, width: 100, height: 100 }],
    });
    const runner = fakeRunner(jxaOutput);

    await queryPhotos({ startTime: 1000000, endTime: 2000000, exportDir: "/tmp/x" }, runner);

    const scriptContent = (runner as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(scriptContent).toContain(new Date(1000000 - 600000).toISOString());
    expect(scriptContent).toContain(new Date(2000000 + 600000).toISOString());
  });

  it("passes the export dir to the JXA script", async () => {
    const jxaOutput = JSON.stringify({
      photos: [{ id: "X", filename: "f.jpg", timestamp: 1717232400000, lat: 1, lng: 2, width: 100, height: 100 }],
    });
    const runner = fakeRunner(jxaOutput);

    await queryPhotos({ ...baseOptions, exportDir: "/tmp/custom-export-dir" }, runner);

    const scriptContent = (runner as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(scriptContent).toContain("/tmp/custom-export-dir");
  });

  it("throws NO_PHOTOS when photos array is empty", async () => {
    const jxaOutput = JSON.stringify({ photos: [] });

    await expect(queryPhotos(baseOptions, fakeRunner(jxaOutput))).rejects.toMatchObject({
      code: "NO_PHOTOS",
    });
  });
});

describe("buildJXAScript", () => {
  it("produces a script containing the date range and export path", () => {
    const script = buildJXAScript("2024-06-01T07:50:00.000Z", "2024-06-01T18:10:00.000Z", "/tmp/export");

    expect(script).toContain("2024-06-01T07:50:00.000Z");
    expect(script).toContain("2024-06-01T18:10:00.000Z");
    expect(script).toContain("/tmp/export");
    expect(script).toContain("Application('Photos')");
    expect(script).toContain("Photos.export");
  });
});
