import { describe, it, expect } from "vitest";
import { matchPhotosToRoute } from "./photo-route-matcher";
import { Trackpoint, PhotoMetadata } from "./types";

function mkTrackpoints(
  coords: [number, number][],
  startMs: number,
  intervalMs: number
): Trackpoint[] {
  return coords.map(([lat, lng], i) => ({
    lat,
    lng,
    timestamp: startMs + i * intervalMs,
  }));
}

function mkPhoto(overrides: Partial<PhotoMetadata> & { id: string }): PhotoMetadata {
  return {
    filename: `${overrides.id}.jpg`,
    timestamp: null,
    lat: null,
    lng: null,
    ...overrides,
  };
}

const BASE_TIME = 1_700_000_000_000;
const MINUTE = 60_000;

const sampleRoute = mkTrackpoints(
  [
    [47.6, -122.3],
    [47.61, -122.31],
    [47.62, -122.32],
    [47.63, -122.33],
    [47.64, -122.34],
  ],
  BASE_TIME,
  5 * MINUTE
);

describe("matchPhotosToRoute", () => {
  it("returns all photos as unplaced when trackpoints are empty", () => {
    const photos = [mkPhoto({ id: "a", timestamp: BASE_TIME })];
    const result = matchPhotosToRoute([], photos, 10);
    expect(result.placed).toHaveLength(0);
    expect(result.unplaced).toHaveLength(1);
  });

  it("places a photo with GPS coordinates using gps method", () => {
    const photo = mkPhoto({ id: "gps1", lat: 47.615, lng: -122.315, timestamp: BASE_TIME });
    const { placed, unplaced } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(1);
    expect(unplaced).toHaveLength(0);
    expect(placed[0].placementMethod).toBe("gps");
    expect(placed[0].lat).toBe(47.615);
    expect(placed[0].lng).toBe(-122.315);
  });

  it("snaps GPS photo routeTimestamp to nearest trackpoint", () => {
    const photo = mkPhoto({ id: "gps2", lat: 47.621, lng: -122.321, timestamp: BASE_TIME });
    const { placed } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed[0].routeTimestamp).toBe(sampleRoute[2].timestamp);
  });

  it("places a photo without GPS by timestamp snap (interpolation)", () => {
    const midTime = BASE_TIME + 7.5 * MINUTE;
    const photo = mkPhoto({ id: "snap1", timestamp: midTime });
    const { placed } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(1);
    expect(placed[0].placementMethod).toBe("timestamp-snap");
    expect(placed[0].lat).toBeCloseTo(47.615, 3);
    expect(placed[0].lng).toBeCloseTo(-122.315, 3);
    expect(placed[0].routeTimestamp).toBe(midTime);
  });

  it("edge-snaps a photo within buffer but before route start", () => {
    const beforeStart = BASE_TIME - 5 * MINUTE;
    const photo = mkPhoto({ id: "edge-before", timestamp: beforeStart });
    const { placed } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(1);
    expect(placed[0].placementMethod).toBe("edge-snap");
    expect(placed[0].lat).toBe(sampleRoute[0].lat);
    expect(placed[0].lng).toBe(sampleRoute[0].lng);
  });

  it("edge-snaps a photo within buffer but after route end", () => {
    const afterEnd = sampleRoute[4].timestamp + 5 * MINUTE;
    const photo = mkPhoto({ id: "edge-after", timestamp: afterEnd });
    const { placed } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(1);
    expect(placed[0].placementMethod).toBe("edge-snap");
    expect(placed[0].lat).toBe(sampleRoute[4].lat);
    expect(placed[0].lng).toBe(sampleRoute[4].lng);
  });

  it("marks a photo as unplaced when completely outside buffer", () => {
    const wayOutside = BASE_TIME - 30 * MINUTE;
    const photo = mkPhoto({ id: "far-away", timestamp: wayOutside });
    const { placed, unplaced } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(0);
    expect(unplaced).toHaveLength(1);
    expect(unplaced[0].id).toBe("far-away");
  });

  it("marks a photo with no timestamp and no GPS as unplaced", () => {
    const photo = mkPhoto({ id: "no-data" });
    const { placed, unplaced } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(0);
    expect(unplaced).toHaveLength(1);
  });

  it("handles multiple photos at the same timestamp", () => {
    const photos = [
      mkPhoto({ id: "same1", timestamp: BASE_TIME + 10 * MINUTE }),
      mkPhoto({ id: "same2", timestamp: BASE_TIME + 10 * MINUTE }),
      mkPhoto({ id: "same3", timestamp: BASE_TIME + 10 * MINUTE }),
    ];
    const { placed } = matchPhotosToRoute(sampleRoute, photos, 10);

    expect(placed).toHaveLength(3);
    expect(placed[0].lat).toBeCloseTo(placed[1].lat, 5);
    expect(placed[0].lng).toBeCloseTo(placed[1].lng, 5);
  });

  it("sorts placed photos by routeTimestamp", () => {
    const photos = [
      mkPhoto({ id: "late", timestamp: BASE_TIME + 15 * MINUTE }),
      mkPhoto({ id: "early", timestamp: BASE_TIME + 2 * MINUTE }),
      mkPhoto({ id: "mid", timestamp: BASE_TIME + 10 * MINUTE }),
    ];
    const { placed } = matchPhotosToRoute(sampleRoute, photos, 10);

    expect(placed[0].photo.id).toBe("early");
    expect(placed[1].photo.id).toBe("mid");
    expect(placed[2].photo.id).toBe("late");
  });

  it("handles a mix of placement strategies in one call", () => {
    const photos = [
      mkPhoto({ id: "has-gps", lat: 47.62, lng: -122.32, timestamp: BASE_TIME }),
      mkPhoto({ id: "has-time", timestamp: BASE_TIME + 5 * MINUTE }),
      mkPhoto({ id: "edge", timestamp: BASE_TIME - 8 * MINUTE }),
      mkPhoto({ id: "lost", timestamp: BASE_TIME - 20 * MINUTE }),
      mkPhoto({ id: "no-info" }),
    ];
    const { placed, unplaced } = matchPhotosToRoute(sampleRoute, photos, 10);

    expect(placed).toHaveLength(3);
    expect(unplaced).toHaveLength(2);

    const methods = placed.map((p) => p.placementMethod).sort();
    expect(methods).toEqual(["edge-snap", "gps", "timestamp-snap"]);
  });

  it("uses custom bufferMinutes value", () => {
    const justOutside = BASE_TIME - 3 * MINUTE;
    const photo = mkPhoto({ id: "tight-buffer", timestamp: justOutside });

    const narrow = matchPhotosToRoute(sampleRoute, [photo], 2);
    expect(narrow.unplaced).toHaveLength(1);

    const wide = matchPhotosToRoute(sampleRoute, [photo], 5);
    expect(wide.placed).toHaveLength(1);
    expect(wide.placed[0].placementMethod).toBe("edge-snap");
  });

  it("places photo exactly at route start via timestamp-snap", () => {
    const photo = mkPhoto({ id: "at-start", timestamp: BASE_TIME });
    const { placed } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(1);
    expect(placed[0].placementMethod).toBe("timestamp-snap");
    expect(placed[0].lat).toBe(sampleRoute[0].lat);
    expect(placed[0].lng).toBe(sampleRoute[0].lng);
  });

  it("places photo exactly at route end via timestamp-snap", () => {
    const photo = mkPhoto({ id: "at-end", timestamp: sampleRoute[4].timestamp });
    const { placed } = matchPhotosToRoute(sampleRoute, [photo], 10);

    expect(placed).toHaveLength(1);
    expect(placed[0].placementMethod).toBe("timestamp-snap");
    expect(placed[0].lat).toBe(sampleRoute[4].lat);
  });
});
