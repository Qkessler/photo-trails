import { Trackpoint, PhotoMetadata, PlacedPhoto } from "./types";

export interface MatchResult {
  placed: PlacedPhoto[];
  unplaced: PhotoMetadata[];
}

export function matchPhotosToRoute(
  trackpoints: Trackpoint[],
  photos: PhotoMetadata[],
  bufferMinutes: number = 10
): MatchResult {
  if (trackpoints.length === 0) {
    return { placed: [], unplaced: [...photos] };
  }

  const bufferMs = bufferMinutes * 60 * 1000;
  const routeStart = trackpoints[0].timestamp;
  const routeEnd = trackpoints[trackpoints.length - 1].timestamp;

  const placed: PlacedPhoto[] = [];
  const unplaced: PhotoMetadata[] = [];

  for (const photo of photos) {
    const result = placePhoto(photo, trackpoints, routeStart, routeEnd, bufferMs);
    if (result) {
      placed.push(result);
    } else {
      unplaced.push(photo);
    }
  }

  placed.sort((a, b) => a.routeTimestamp - b.routeTimestamp);
  return { placed, unplaced };
}

function placePhoto(
  photo: PhotoMetadata,
  trackpoints: Trackpoint[],
  routeStart: number,
  routeEnd: number,
  bufferMs: number
): PlacedPhoto | null {
  if (photo.lat != null && photo.lng != null) {
    return placeByGps(photo, trackpoints);
  }

  if (photo.timestamp == null) {
    return null;
  }

  if (photo.timestamp >= routeStart && photo.timestamp <= routeEnd) {
    return placeByTimestampSnap(photo, trackpoints);
  }

  if (
    photo.timestamp >= routeStart - bufferMs &&
    photo.timestamp <= routeEnd + bufferMs
  ) {
    return placeByEdgeSnap(photo, trackpoints);
  }

  return null;
}

function placeByGps(photo: PhotoMetadata, trackpoints: Trackpoint[]): PlacedPhoto {
  const nearest = findNearestTrackpoint(photo.lat!, photo.lng!, trackpoints);
  return {
    photo,
    lat: photo.lat!,
    lng: photo.lng!,
    routeTimestamp: nearest.timestamp,
    placementMethod: "gps",
  };
}

function placeByTimestampSnap(photo: PhotoMetadata, trackpoints: Trackpoint[]): PlacedPhoto {
  const position = interpolatePosition(photo.timestamp!, trackpoints);
  return {
    photo,
    lat: position.lat,
    lng: position.lng,
    routeTimestamp: photo.timestamp!,
    placementMethod: "timestamp-snap",
  };
}

function placeByEdgeSnap(photo: PhotoMetadata, trackpoints: Trackpoint[]): PlacedPhoto {
  const first = trackpoints[0];
  const last = trackpoints[trackpoints.length - 1];

  const snapTo = photo.timestamp! < first.timestamp ? first : last;

  return {
    photo,
    lat: snapTo.lat,
    lng: snapTo.lng,
    routeTimestamp: snapTo.timestamp,
    placementMethod: "edge-snap",
  };
}

function findNearestTrackpoint(
  lat: number,
  lng: number,
  trackpoints: Trackpoint[]
): Trackpoint {
  let best = trackpoints[0];
  let bestDist = distanceSquared(lat, lng, best.lat, best.lng);

  for (let i = 1; i < trackpoints.length; i++) {
    const d = distanceSquared(lat, lng, trackpoints[i].lat, trackpoints[i].lng);
    if (d < bestDist) {
      bestDist = d;
      best = trackpoints[i];
    }
  }

  return best;
}

function interpolatePosition(
  timestamp: number,
  trackpoints: Trackpoint[]
): { lat: number; lng: number } {
  if (timestamp <= trackpoints[0].timestamp) {
    return { lat: trackpoints[0].lat, lng: trackpoints[0].lng };
  }
  if (timestamp >= trackpoints[trackpoints.length - 1].timestamp) {
    const last = trackpoints[trackpoints.length - 1];
    return { lat: last.lat, lng: last.lng };
  }

  for (let i = 0; i < trackpoints.length - 1; i++) {
    const a = trackpoints[i];
    const b = trackpoints[i + 1];

    if (timestamp >= a.timestamp && timestamp <= b.timestamp) {
      const ratio = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);
      return {
        lat: a.lat + (b.lat - a.lat) * ratio,
        lng: a.lng + (b.lng - a.lng) * ratio,
      };
    }
  }

  return { lat: trackpoints[0].lat, lng: trackpoints[0].lng };
}

function distanceSquared(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return dLat * dLat + dLng * dLng;
}
