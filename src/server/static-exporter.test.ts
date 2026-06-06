import { describe, it, expect } from "vitest";
import { buildActivityJson } from "./static-exporter";
import type { ActivityData } from "@core/types";

function makeActivity(filenames: string[]): ActivityData {
  return {
    segments: [
      {
        isGap: false,
        points: [{ lat: 47.6, lng: -122.3, timestamp: 1000, ele: 100 }],
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

describe("buildActivityJson", () => {
  it("rewrites photo URLs to relative thumb/display paths", () => {
    const result = buildActivityJson(makeActivity(["sunset.jpg"]), "photos");

    const photo = result.clusters[0].photos[0].photo as Record<string, unknown>;
    expect(photo.thumbnailUrl).toBe("photos/sunset_thumb.jpg");
    expect(photo.displayUrl).toBe("photos/sunset_display.jpg");
  });

  it("strips nested extensions correctly (HEIC, PNG)", () => {
    const result = buildActivityJson(makeActivity(["IMG_0042.HEIC", "trail.png"]), "photos");

    const photos = result.clusters[0].photos.map((p) => p.photo as Record<string, unknown>);
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
    expect((input.clusters[0].photos[0].photo as Record<string, unknown>).thumbnailUrl).toBeUndefined();
  });
});
