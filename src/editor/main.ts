import "leaflet/dist/leaflet.css";
import "@core/map/photo-markers.css";
import "@core/filmstrip/filmstrip.css";
import "@core/lightbox/lightbox.css";
import "@editor/controls/controls.css";

import type { ActivityData, PlacedPhoto, PhotoCluster } from "@core/types";
import { createRouteLayer } from "@core/map";
import { PhotoMarkersLayer } from "@core/map/photo-markers";
import { Filmstrip } from "@core/filmstrip";
import { createLightbox } from "@core/lightbox";
import {
  EditorState,
  Toolbar,
  PhotoToggleOverlay,
  HeroPicker,
} from "@editor/controls";

const API_BASE = "/api";

async function loadActivityData(): Promise<ActivityData> {
  const res = await fetch(`${API_BASE}/activity`);
  if (!res.ok) {
    const fallback = await fetch("activity.json");
    if (!fallback.ok) throw new Error(`No activity data available (${res.status})`);
    return fallback.json();
  }
  return res.json();
}

function showStatus(message: string, isError = false): void {
  let el = document.querySelector(".editor-status") as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = "editor-status";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle("editor-status--error", isError);
  if (!isError) {
    setTimeout(() => { el!.textContent = ""; }, 3000);
  }
}

async function importGpx(file: File): Promise<void> {
  showStatus("Importing GPX…");
  const formData = new FormData();
  formData.append("gpx", file);

  const res = await fetch(`${API_BASE}/import-gpx`, { method: "POST", body: formData });
  if (!res.ok) {
    showStatus(`GPX import failed: ${res.statusText}`, true);
    return;
  }
  showStatus("GPX imported — reloading…");
  setTimeout(() => location.reload(), 500);
}

async function exportActivity(state: EditorState, activity: ActivityData): Promise<void> {
  showStatus("Exporting…");
  const curated = state.applyToActivity(activity);
  const res = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(curated),
  });
  if (!res.ok) {
    showStatus(`Export failed: ${res.statusText}`, true);
    return;
  }
  showStatus("Export complete ✓");
}

async function init(): Promise<void> {
  const data = await loadActivityData();
  const editorState = new EditorState();

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
      const allPhotos = data.clusters.flatMap((c) => c.photos);
      const index = allPhotos.findIndex((p) => p.photo.id === photo.photo.id);
      lightbox.open(allPhotos, index >= 0 ? index : 0);
    },
    onClusterClick(cluster) {
      map.panTo([cluster.lat, cluster.lng], { animate: true });
    },
  });
  filmstrip.setClusters(data.clusters);

  // --- Editor Controls ---

  const photoToggle = new PhotoToggleOverlay(editorState, {
    onSelectionChange(_photoId, _selected) {
      refreshView();
    },
  });

  const heroPicker = new HeroPicker(editorState, {
    onHeroChange(_clusterIndex, _heroIndex) {
      refreshView();
    },
  });

  new Toolbar(mapContainer, editorState, {
    onGpxImport: (file) => importGpx(file),
    onExport: () => exportActivity(editorState, data),
  });

  attachToggleOverlays();

  function attachToggleOverlays(): void {
    photoToggle.detachAll();
    const thumbnails = filmstripContainer.querySelectorAll<HTMLElement>("[data-photo-id]");
    thumbnails.forEach((el) => {
      const id = el.dataset.photoId!;
      photoToggle.attachToThumbnail(id, el);
    });
  }

  function refreshView(): void {
    const curated = editorState.applyToActivity(data);
    markers.setClusters(curated.clusters);
    filmstrip.setClusters(curated.clusters);
    photoToggle.refreshAll();

    requestAnimationFrame(() => attachToggleOverlays());
  }

  showStatus("Editor ready — Shift+click photos to deselect");
}

init().catch((err) => {
  console.error("Editor initialization failed:", err);
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;">
      <h2>Failed to load editor</h2>
      <p>Make sure the dev server is running or <code>activity.json</code> is available.</p>
      <pre style="margin-top:1rem;font-size:0.8rem;opacity:0.7;">${err.message}</pre>
    </div>`;
  }
});
