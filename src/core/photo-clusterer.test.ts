import { describe, it, expect } from "vitest";
import { clusterPhotos } from "./photo-clusterer";
import { PlacedPhoto } from "./types";

function makePlaced(overrides: Partial<PlacedPhoto> & { routeTimestamp: number }): PlacedPhoto {
  return {
    photo: {
      id: `photo-${overrides.routeTimestamp}`,
      filename: `IMG_${overrides.routeTimestamp}.jpg`,
      timestamp: overrides.routeTimestamp,
      lat: overrides.lat ?? 47.6,
      lng: overrides.lng ?? -122.3,
    },
    lat: overrides.lat ?? 47.6,
    lng: overrides.lng ?? -122.3,
    routeTimestamp: overrides.routeTimestamp,
    placementMethod: overrides.placementMethod ?? "gps",
  };
}

describe("clusterPhotos", () => {
  it("returns empty array for no photos", () => {
    expect(clusterPhotos([], 30)).toEqual([]);
  });

  it("returns a single cluster for one photo", () => {
    const photos = [makePlaced({ routeTimestamp: 1000 })];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].photos).toHaveLength(1);
    expect(clusters[0].heroIndex).toBe(0);
  });

  it("groups a burst of photos within the window into one cluster", () => {
    const photos = [
      makePlaced({ routeTimestamp: 1000 }),
      makePlaced({ routeTimestamp: 3000 }),
      makePlaced({ routeTimestamp: 5000 }),
      makePlaced({ routeTimestamp: 8000 }),
    ];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].photos).toHaveLength(4);
  });

  it("splits photos into multiple clusters when gaps exceed the window", () => {
    const photos = [
      makePlaced({ routeTimestamp: 0 }),
      makePlaced({ routeTimestamp: 10_000 }),
      makePlaced({ routeTimestamp: 60_000 }),
      makePlaced({ routeTimestamp: 65_000 }),
    ];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters).toHaveLength(2);
    expect(clusters[0].photos).toHaveLength(2);
    expect(clusters[1].photos).toHaveLength(2);
  });

  it("handles exact boundary — photos exactly windowSeconds apart stay in same cluster", () => {
    const photos = [
      makePlaced({ routeTimestamp: 0 }),
      makePlaced({ routeTimestamp: 30_000 }),
    ];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].photos).toHaveLength(2);
  });

  it("splits when gap is 1ms over the window", () => {
    const photos = [
      makePlaced({ routeTimestamp: 0 }),
      makePlaced({ routeTimestamp: 30_001 }),
    ];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters).toHaveLength(2);
  });

  it("sorts photos by routeTimestamp regardless of input order", () => {
    const photos = [
      makePlaced({ routeTimestamp: 90_000 }),
      makePlaced({ routeTimestamp: 1000 }),
      makePlaced({ routeTimestamp: 50_000 }),
    ];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters).toHaveLength(3);
    expect(clusters[0].timestamp).toBe(1000);
    expect(clusters[1].timestamp).toBe(50_000);
    expect(clusters[2].timestamp).toBe(90_000);
  });

  it("uses first photo position as cluster representative", () => {
    const photos = [
      makePlaced({ routeTimestamp: 1000, lat: 47.0, lng: -122.0 }),
      makePlaced({ routeTimestamp: 2000, lat: 47.5, lng: -122.5 }),
    ];
    const clusters = clusterPhotos(photos, 30);

    expect(clusters[0].lat).toBe(47.0);
    expect(clusters[0].lng).toBe(-122.0);
    expect(clusters[0].timestamp).toBe(1000);
  });
});
