export interface Trackpoint {
  lat: number;
  lng: number;
  timestamp: number; // Unix ms
  ele?: number;
}

export interface RouteSegment {
  points: Trackpoint[];
  isGap: boolean;
}

export interface PhotoMetadata {
  id: string;
  filename: string;
  timestamp: number | null; // Unix ms, null if unknown
  lat: number | null;
  lng: number | null;
  width?: number;
  height?: number;
}

export interface PlacedPhoto {
  photo: PhotoMetadata;
  lat: number;
  lng: number;
  routeTimestamp: number; // interpolated position on route, Unix ms
  placementMethod: "gps" | "timestamp-snap" | "edge-snap";
}

export interface PhotoCluster {
  photos: PlacedPhoto[];
  heroIndex: number;
  lat: number;
  lng: number;
  timestamp: number; // representative timestamp (first photo)
}

export interface ActivityData {
  segments: RouteSegment[];
  clusters: PhotoCluster[];
  unplaced: PhotoMetadata[];
}
