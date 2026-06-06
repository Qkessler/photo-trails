import L from "leaflet";
import type { RouteSegment } from "@core/types";

export interface RouteLayerOptions {
  normalColor?: string;
  gapColor?: string;
  normalWeight?: number;
  gapWeight?: number;
}

const TILE_LAYERS = {
  openTopoMap: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://viewfinderpanoramas.org">SRTM</a> | ' +
      'Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  esriSatellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, " +
      "Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 19,
  },
} as const;

export function createRouteLayer(
  container: HTMLElement,
  segments: RouteSegment[],
  options: RouteLayerOptions = {}
): { map: L.Map; polylines: L.Polyline[]; destroy: () => void } {
  const {
    normalColor = "#2563eb",
    gapColor = "#94a3b8",
    normalWeight = 4,
    gapWeight = 3,
  } = options;

  const map = L.map(container);

  const topoLayer = L.tileLayer(TILE_LAYERS.openTopoMap.url, {
    attribution: TILE_LAYERS.openTopoMap.attribution,
    maxZoom: TILE_LAYERS.openTopoMap.maxZoom,
  });

  const satelliteLayer = L.tileLayer(TILE_LAYERS.esriSatellite.url, {
    attribution: TILE_LAYERS.esriSatellite.attribution,
    maxZoom: TILE_LAYERS.esriSatellite.maxZoom,
  });

  satelliteLayer.addTo(map);

  const polylines: L.Polyline[] = [];
  const allLatLngs: L.LatLng[] = [];

  for (const segment of segments) {
    if (segment.points.length < 2) continue;

    const latlngs = segment.points.map((p) => L.latLng(p.lat, p.lng));
    allLatLngs.push(...latlngs);

    const polyline = L.polyline(latlngs, {
      color: segment.isGap ? gapColor : normalColor,
      weight: segment.isGap ? gapWeight : normalWeight,
      dashArray: segment.isGap ? "8, 12" : undefined,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    polylines.push(polyline);
  }

  if (allLatLngs.length > 0) {
    const bounds = L.latLngBounds(allLatLngs);
    map.fitBounds(bounds, { padding: [40, 40] });
  } else {
    map.setView([0, 0], 2);
  }

  function destroy() {
    map.remove();
  }

  return { map, polylines, destroy };
}
