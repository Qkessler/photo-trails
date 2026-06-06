import "leaflet/dist/leaflet.css";
import "@core/map/photo-markers.css";
import "@core/filmstrip/filmstrip.css";
import "@core/lightbox/lightbox.css";

import type { ActivityData, PlacedPhoto, PhotoCluster } from "@core/types";
import { createRouteLayer } from "@core/map";
import { PhotoMarkersLayer } from "@core/map/photo-markers";
import { Filmstrip } from "@core/filmstrip";
import { createLightbox } from "@core/lightbox";

const ACTIVITY_URL = "activity.json";

async function loadActivityData(): Promise<ActivityData> {
  const res = await fetch(ACTIVITY_URL);
  if (!res.ok) throw new Error(`Failed to load ${ACTIVITY_URL}: ${res.status}`);
  return res.json();
}

function getAllPhotos(clusters: PhotoCluster[]): PlacedPhoto[] {
  return clusters.flatMap((c) => c.photos);
}

async function init(): Promise<void> {
  const data = await loadActivityData();

  const mapContainer = document.getElementById("map")!;
  const filmstripContainer = document.getElementById("filmstrip-container")!;

  const { map } = createRouteLayer(mapContainer, data.segments);

  const lightbox = createLightbox({
    onNavigate(photo) {
      markers.clearHighlights();
      markers.highlightPhoto(photo.photo.id);
      filmstrip.highlightPhoto(photo);
    },
    onClose() {
      markers.clearHighlights();
      filmstrip.highlightPhoto(null);
    },
  });

  const markers = new PhotoMarkersLayer({
    onPhotoClick(photo, cluster) {
      const index = cluster.photos.indexOf(photo);
      lightbox.openCluster(cluster, index >= 0 ? index : undefined);
    },
  });
  markers.setClusters(data.clusters);
  markers.addTo(map);

  const filmstrip = new Filmstrip(filmstripContainer, {
    onPhotoHover(photo) {
      markers.clearHighlights();
      if (photo) {
        markers.highlightPhoto(photo.photo.id);
        map.panTo([photo.lat, photo.lng], { animate: true, duration: 0.3 });
      }
    },
    onPhotoClick(photo) {
      const allPhotos = getAllPhotos(data.clusters);
      const index = allPhotos.findIndex((p) => p.photo.id === photo.photo.id);
      lightbox.open(allPhotos, index >= 0 ? index : 0);
    },
    onClusterClick(cluster) {
      map.panTo([cluster.lat, cluster.lng], { animate: true });
    },
  });
  filmstrip.setClusters(data.clusters);
}

init().catch((err) => {
  console.error("Viewer initialization failed:", err);
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;">
      <h2>Failed to load activity</h2>
      <p>Make sure <code>activity.json</code> is available at the root.</p>
      <pre style="margin-top:1rem;font-size:0.8rem;opacity:0.7;">${err.message}</pre>
    </div>`;
  }
});
