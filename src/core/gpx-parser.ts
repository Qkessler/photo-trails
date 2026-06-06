import { Trackpoint, RouteSegment } from "./types";

const GAP_THRESHOLD_MS = 60_000;

let linkedom: any = null;

async function getDocument(gpxString: string): Promise<Document> {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(gpxString, "application/xml");
  }
  if (!linkedom) linkedom = await import("linkedom");
  return linkedom.parseHTML(gpxString).document;
}

export async function parseGPX(gpxString: string): Promise<{
  trackpoints: Trackpoint[];
  segments: RouteSegment[];
}> {
  const doc = await getDocument(gpxString);

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX: malformed XML");
  }

  const trackpoints: Trackpoint[] = [];
  const trkpts = doc.querySelectorAll("trkpt");

  for (let i = 0; i < trkpts.length; i++) {
    const trkpt = trkpts[i];
    const lat = parseFloat(trkpt.getAttribute("lat") ?? "");
    const lon = parseFloat(trkpt.getAttribute("lon") ?? "");
    if (isNaN(lat) || isNaN(lon)) continue;

    const timeEl = trkpt.querySelector("time");
    if (!timeEl?.textContent) continue;
    const timestamp = new Date(timeEl.textContent).getTime();
    if (isNaN(timestamp)) continue;

    const eleEl = trkpt.querySelector("ele");
    const ele = eleEl?.textContent ? parseFloat(eleEl.textContent) : undefined;

    trackpoints.push({
      lat,
      lng: lon,
      timestamp,
      ele: ele !== undefined && !isNaN(ele) ? ele : undefined,
    });
  }

  const segments = buildSegments(trackpoints);

  return { trackpoints, segments };
}

function buildSegments(trackpoints: Trackpoint[]): RouteSegment[] {
  if (trackpoints.length === 0) return [];
  if (trackpoints.length === 1) return [{ points: [trackpoints[0]], isGap: false }];

  const segments: RouteSegment[] = [];
  let currentPoints: Trackpoint[] = [trackpoints[0]];

  for (let i = 1; i < trackpoints.length; i++) {
    const dt = trackpoints[i].timestamp - trackpoints[i - 1].timestamp;

    if (dt > GAP_THRESHOLD_MS) {
      segments.push({ points: currentPoints, isGap: false });
      segments.push({
        points: [trackpoints[i - 1], trackpoints[i]],
        isGap: true,
      });
      currentPoints = [trackpoints[i]];
    } else {
      currentPoints.push(trackpoints[i]);
    }
  }

  if (currentPoints.length > 0) {
    segments.push({ points: currentPoints, isGap: false });
  }

  return segments;
}
