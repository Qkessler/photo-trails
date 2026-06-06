import { PlacedPhoto, PhotoCluster } from "./types";

export function clusterPhotos(
  photos: PlacedPhoto[],
  windowSeconds: number
): PhotoCluster[] {
  if (photos.length === 0) return [];

  const sorted = [...photos].sort(
    (a, b) => a.routeTimestamp - b.routeTimestamp
  );

  const windowMs = windowSeconds * 1000;
  const clusters: PhotoCluster[] = [];
  let currentGroup: PlacedPhoto[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    if (sorted[i].routeTimestamp - prev.routeTimestamp <= windowMs) {
      currentGroup.push(sorted[i]);
    } else {
      clusters.push(buildCluster(currentGroup));
      currentGroup = [sorted[i]];
    }
  }

  clusters.push(buildCluster(currentGroup));
  return clusters;
}

function buildCluster(photos: PlacedPhoto[]): PhotoCluster {
  return {
    photos,
    heroIndex: 0,
    lat: photos[0].lat,
    lng: photos[0].lng,
    timestamp: photos[0].routeTimestamp,
  };
}
