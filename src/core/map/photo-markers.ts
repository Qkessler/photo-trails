import * as L from "leaflet";
import type { PhotoCluster, PlacedPhoto } from "../types";

export interface PhotoMarkersOptions {
  thumbnailBaseUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  onPhotoClick?: (photo: PlacedPhoto, cluster: PhotoCluster) => void;
}

const DEFAULTS = {
  thumbnailWidth: 48,
  thumbnailHeight: 36,
  hoverScale: 1.4,
  transitionMs: 150,
} as const;

export class PhotoMarkersLayer {
  private layerGroup: L.LayerGroup;
  private options_: PhotoMarkersOptions;
  private clusters: PhotoCluster[] = [];
  private markerMap = new Map<string, L.Marker>();

  constructor(options: PhotoMarkersOptions = {}) {
    this.layerGroup = L.layerGroup();
    this.options_ = options;
  }

  getLayer(): L.LayerGroup {
    return this.layerGroup;
  }

  addTo(map: L.Map): this {
    this.layerGroup.addTo(map);
    return this;
  }

  remove(): this {
    this.layerGroup.remove();
    return this;
  }

  setClusters(clusters: PhotoCluster[]): this {
    this.clusters = clusters;
    this.redraw();
    return this;
  }

  highlightPhoto(photoId: string): void {
    const marker = this.markerMap.get(photoId);
    if (marker) {
      const el = marker.getElement();
      if (el) el.classList.add("photo-marker--highlight");
    }
  }

  clearHighlights(): void {
    for (const marker of this.markerMap.values()) {
      const el = marker.getElement();
      if (el) el.classList.remove("photo-marker--highlight");
    }
  }

  private redraw(): void {
    this.layerGroup.clearLayers();
    this.markerMap.clear();

    for (const cluster of this.clusters) {
      if (cluster.photos.length === 1) {
        this.addSingleMarker(cluster.photos[0], cluster);
      } else {
        this.addClusterMarker(cluster);
      }
    }
  }

  private addSingleMarker(photo: PlacedPhoto, cluster: PhotoCluster): void {
    const icon = this.createThumbnailIcon(photo);
    const marker = L.marker([photo.lat, photo.lng], { icon });

    this.attachHoverBehavior(marker);
    this.attachClickBehavior(marker, photo, cluster);
    this.layerGroup.addLayer(marker);
    this.markerMap.set(photo.photo.id, marker);
  }

  private addClusterMarker(cluster: PhotoCluster): void {
    const hero = cluster.photos[cluster.heroIndex];
    const icon = this.createClusterIcon(hero, cluster.photos.length);
    const marker = L.marker([cluster.lat, cluster.lng], { icon });

    this.attachHoverBehavior(marker);
    this.attachClickBehavior(marker, hero, cluster);
    this.layerGroup.addLayer(marker);
    this.markerMap.set(hero.photo.id, marker);
  }

  private createThumbnailIcon(photo: PlacedPhoto): L.DivIcon {
    const w = this.options_.thumbnailWidth ?? DEFAULTS.thumbnailWidth;
    const h = this.options_.thumbnailHeight ?? DEFAULTS.thumbnailHeight;
    const src = this.thumbnailUrl(photo);

    const html = `<div class="photo-marker__frame"><img src="${src}" alt="${photo.photo.filename}" width="${w}" height="${h}" loading="lazy" /></div>`;

    return L.divIcon({
      className: "photo-marker",
      html,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }

  private createClusterIcon(hero: PlacedPhoto, count: number): L.DivIcon {
    const w = this.options_.thumbnailWidth ?? DEFAULTS.thumbnailWidth;
    const h = this.options_.thumbnailHeight ?? DEFAULTS.thumbnailHeight;
    const src = this.thumbnailUrl(hero);

    const html = `<div class="photo-marker__frame photo-marker__frame--cluster"><img src="${src}" alt="${hero.photo.filename}" width="${w}" height="${h}" loading="lazy" /><span class="photo-marker__badge">${count}</span></div>`;

    return L.divIcon({
      className: "photo-marker",
      html,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }

  private thumbnailUrl(photo: PlacedPhoto): string {
    const base = this.options_.thumbnailBaseUrl ?? "photos/thumbs";
    return `${base}/${photo.photo.id}.jpg`;
  }

  private attachHoverBehavior(marker: L.Marker): void {
    marker.on("mouseover", () => {
      const el = marker.getElement();
      if (el) {
        el.style.transform += ` scale(${DEFAULTS.hoverScale})`;
        el.style.zIndex = "1000";
        el.style.transition = `transform ${DEFAULTS.transitionMs}ms ease`;
      }
    });

    marker.on("mouseout", () => {
      const el = marker.getElement();
      if (el) {
        el.style.transform = el.style.transform.replace(
          / scale\([\d.]+\)/,
          ""
        );
        el.style.zIndex = "";
      }
    });
  }

  private attachClickBehavior(
    marker: L.Marker,
    photo: PlacedPhoto,
    cluster: PhotoCluster
  ): void {
    marker.on("click", () => {
      this.options_.onPhotoClick?.(photo, cluster);
    });
  }
}

export function createPhotoMarkersLayer(
  options?: PhotoMarkersOptions
): PhotoMarkersLayer {
  return new PhotoMarkersLayer(options);
}
