import { describe, it, expect } from "vitest";
import { parseGPX } from "./gpx-parser";

const makeGPX = (trkpts: string) => `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk><trkseg>${trkpts}</trkseg></trk>
</gpx>`;

const pt = (lat: number, lon: number, time: string, ele?: number) =>
  `<trkpt lat="${lat}" lon="${lon}">
    ${ele !== undefined ? `<ele>${ele}</ele>` : ""}
    <time>${time}</time>
  </trkpt>`;

describe("parseGPX", () => {
  it("parses a simple track with multiple points", () => {
    const gpx = makeGPX(
      pt(37.6, -1.03, "2026-06-06T05:04:27Z", 86) +
      pt(37.61, -1.04, "2026-06-06T05:04:35Z", 84) +
      pt(37.62, -1.05, "2026-06-06T05:04:50Z", 82)
    );

    const result = parseGPX(gpx);

    expect(result.trackpoints).toHaveLength(3);
    expect(result.trackpoints[0]).toEqual({
      lat: 37.6,
      lng: -1.03,
      timestamp: new Date("2026-06-06T05:04:27Z").getTime(),
      ele: 86,
    });
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].isGap).toBe(false);
    expect(result.segments[0].points).toHaveLength(3);
  });

  it("detects gaps when time between points exceeds 60s", () => {
    const gpx = makeGPX(
      pt(37.6, -1.03, "2026-06-06T05:00:00Z") +
      pt(37.61, -1.04, "2026-06-06T05:00:30Z") +
      pt(37.62, -1.05, "2026-06-06T05:02:31Z") + // 121s gap from previous
      pt(37.63, -1.06, "2026-06-06T05:02:50Z")
    );

    const result = parseGPX(gpx);

    expect(result.trackpoints).toHaveLength(4);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].isGap).toBe(false);
    expect(result.segments[0].points).toHaveLength(2);
    expect(result.segments[1].isGap).toBe(true);
    expect(result.segments[1].points).toHaveLength(2);
    expect(result.segments[2].isGap).toBe(false);
    expect(result.segments[2].points).toHaveLength(2);
  });

  it("returns empty arrays for empty GPX", () => {
    const gpx = makeGPX("");
    const result = parseGPX(gpx);
    expect(result.trackpoints).toHaveLength(0);
    expect(result.segments).toHaveLength(0);
  });

  it("handles a single trackpoint", () => {
    const gpx = makeGPX(pt(37.6, -1.03, "2026-06-06T05:00:00Z"));
    const result = parseGPX(gpx);
    expect(result.trackpoints).toHaveLength(1);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].isGap).toBe(false);
  });

  it("throws on malformed XML", () => {
    expect(() => parseGPX("<gpx><not-closed>")).toThrow("Invalid GPX");
  });

  it("handles multiple trkseg elements across tracks", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1">
  <trk>
    <trkseg>${pt(37.6, -1.03, "2026-06-06T05:00:00Z")}</trkseg>
    <trkseg>${pt(37.7, -1.04, "2026-06-06T05:00:10Z")}</trkseg>
  </trk>
  <trk>
    <trkseg>${pt(37.8, -1.05, "2026-06-06T05:00:20Z")}</trkseg>
  </trk>
</gpx>`;

    const result = parseGPX(gpx);
    expect(result.trackpoints).toHaveLength(3);
  });

  it("skips points without valid time", () => {
    const gpx = makeGPX(
      `<trkpt lat="37.6" lon="-1.03"><ele>80</ele></trkpt>` +
      pt(37.61, -1.04, "2026-06-06T05:00:00Z")
    );

    const result = parseGPX(gpx);
    expect(result.trackpoints).toHaveLength(1);
  });

  it("handles points without elevation", () => {
    const gpx = makeGPX(pt(37.6, -1.03, "2026-06-06T05:00:00Z"));
    const result = parseGPX(gpx);
    expect(result.trackpoints[0].ele).toBeUndefined();
  });

  it("boundary: exactly 60s is NOT a gap", () => {
    const gpx = makeGPX(
      pt(37.6, -1.03, "2026-06-06T05:00:00Z") +
      pt(37.61, -1.04, "2026-06-06T05:01:00Z")
    );

    const result = parseGPX(gpx);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].isGap).toBe(false);
  });

  it("boundary: 61s IS a gap", () => {
    const gpx = makeGPX(
      pt(37.6, -1.03, "2026-06-06T05:00:00Z") +
      pt(37.61, -1.04, "2026-06-06T05:01:01Z")
    );

    const result = parseGPX(gpx);
    expect(result.segments).toHaveLength(3);
    expect(result.segments[1].isGap).toBe(true);
  });
});
