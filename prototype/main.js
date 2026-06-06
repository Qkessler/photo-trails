// PROTOTYPE — Three radically different UI layouts for the map + photo viewer.
// Switchable via ?variant=A|B|C and floating bottom bar.
// Question: "What should the map + photo viewer look like?"

import L from 'leaflet';
import { route, gaps, photos, clusters, activity } from './data.js';

const variants = {
  A: { name: 'Full-bleed map', render: renderVariantA },
  B: { name: 'Split panel', render: renderVariantB },
  C: { name: 'Film strip', render: renderVariantC },
};

function getVariant() {
  return new URLSearchParams(location.search).get('variant') || 'A';
}

function setVariant(key) {
  const url = new URL(location.href);
  url.searchParams.set('variant', key);
  history.replaceState(null, '', url);
  render();
}

function render() {
  const key = getVariant();
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.className = `variant-${key.toLowerCase()}`;
  variants[key].render(app);
  renderSwitcher();
}

// ─── VARIANT A: Full-bleed map with floating photo thumbnails as markers ───

function renderVariantA(container) {
  container.innerHTML = `
    <div class="va-header">
      <h1>${activity.name}</h1>
      <span class="va-meta">${activity.date} · ${activity.distance} · ${activity.duration} · ↑${activity.elevation}</span>
    </div>
    <div id="map" class="va-map"></div>
    <div id="lightbox" class="lightbox hidden"></div>
  `;
  const map = createMap('map');
  drawRoute(map);
  placePhotoMarkers(map, 'thumbnail');
}

// ─── VARIANT B: Side-by-side split — map left, photo list right ───

function renderVariantB(container) {
  container.innerHTML = `
    <div class="vb-layout">
      <div class="vb-map-pane">
        <div id="map" class="vb-map"></div>
      </div>
      <div class="vb-sidebar">
        <div class="vb-header">
          <h1>${activity.name}</h1>
          <p class="vb-meta">${activity.date} · ${activity.distance} · ${activity.duration}</p>
        </div>
        <div class="vb-photo-list" id="photo-list"></div>
      </div>
    </div>
    <div id="lightbox" class="lightbox hidden"></div>
  `;
  const map = createMap('map');
  drawRoute(map);
  placePhotoMarkers(map, 'dot');

  const list = document.getElementById('photo-list');
  photos.filter(p => !p.clusteredWith).forEach(photo => {
    const cluster = clusters.find(c => c.hero === photo.id);
    const count = cluster ? cluster.photos.length : 1;
    const card = document.createElement('div');
    card.className = 'vb-photo-card';
    card.innerHTML = `
      <img src="${photo.thumbnail}" alt="${photo.caption}" />
      <div class="vb-photo-info">
        <span class="vb-time">${photo.time}</span>
        <span class="vb-caption">${photo.caption}</span>
        ${count > 1 ? `<span class="vb-badge">+${count - 1}</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => showLightbox(photo));
    list.appendChild(card);
  });
}

// ─── VARIANT C: Full-bleed map with rectangular photo markers + film strip ───

function renderVariantC(container) {
  container.innerHTML = `
    <div class="vc-layout">
      <div class="vc-map-area">
        <div id="map" class="vc-map"></div>
        <div class="vc-overlay-title">
          <h1>${activity.name}</h1>
          <span>${activity.date} · ${activity.distance}</span>
        </div>
      </div>
      <div class="vc-filmstrip" id="filmstrip"></div>
    </div>
    <div id="lightbox" class="lightbox hidden"></div>
  `;
  const map = createMap('map');
  drawRoute(map);
  const markerElements = placePhotoMarkers(map, 'rect');

  const strip = document.getElementById('filmstrip');
  photos.forEach(photo => {
    const thumb = document.createElement('div');
    thumb.className = 'vc-thumb';
    thumb.innerHTML = `<img src="${photo.thumbnail}" alt="${photo.caption}" /><span class="vc-thumb-time">${photo.time}</span>`;
    thumb.addEventListener('click', () => {
      showLightbox(photo);
      map.panTo(photo.position, { animate: true });
    });
    thumb.addEventListener('mouseenter', () => {
      map.panTo(photo.position, { animate: true, duration: 0.3 });
      const el = markerElements[photo.id];
      if (el) el.classList.add('marker-highlight');
    });
    thumb.addEventListener('mouseleave', () => {
      const el = markerElements[photo.id];
      if (el) el.classList.remove('marker-highlight');
    });
    strip.appendChild(thumb);
  });
}

// ─── Shared utilities ───

function createMap(elementId) {
  const map = L.map(elementId, { zoomControl: false });
  L.control.zoom({ position: 'topright' }).addTo(map);

  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenTopoMap',
    maxZoom: 17,
  });
  const satellite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri', maxZoom: 19 }
  );
  topo.addTo(map);
  L.control.layers({ Terrain: topo, Satellite: satellite }, null, { position: 'topright' }).addTo(map);

  map.fitBounds(route.map(p => [p[0], p[1]]), { padding: [40, 40] });
  return map;
}

function drawRoute(map) {
  // Solid segments
  let segStart = 0;
  gaps.forEach(gap => {
    if (segStart <= gap.from) {
      L.polyline(route.slice(segStart, gap.from + 1), { color: '#e63946', weight: 4, opacity: 0.9 }).addTo(map);
    }
    // Dashed gap
    L.polyline(route.slice(gap.from, gap.to + 1), {
      color: '#e63946', weight: 3, opacity: 0.5, dashArray: '8, 12',
    }).addTo(map);
    segStart = gap.to;
  });
  // Final segment
  L.polyline(route.slice(segStart), { color: '#e63946', weight: 4, opacity: 0.9 }).addTo(map);
}

function placePhotoMarkers(map, style) {
  const placed = photos.filter(p => !p.clusteredWith);
  const markerElements = {};
  placed.forEach(photo => {
    const cluster = clusters.find(c => c.hero === photo.id);
    const count = cluster ? cluster.photos.length : 1;

    if (style === 'thumbnail') {
      const icon = L.divIcon({
        className: 'photo-marker',
        html: `<div class="photo-marker-inner">
          <img src="${photo.thumbnail}" />
          ${count > 1 ? `<span class="marker-badge">${count}</span>` : ''}
        </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      const marker = L.marker(photo.position, { icon }).addTo(map).on('click', () => showLightbox(photo));
      markerElements[photo.id] = marker.getElement();
    } else if (style === 'rect') {
      const icon = L.divIcon({
        className: 'rect-marker',
        html: `<div class="rect-marker-inner">
          <img src="${photo.thumbnail}" />
          ${count > 1 ? `<span class="marker-badge">${count}</span>` : ''}
        </div>`,
        iconSize: [56, 40],
        iconAnchor: [28, 20],
      });
      const marker = L.marker(photo.position, { icon }).addTo(map).on('click', () => showLightbox(photo));
      markerElements[photo.id] = marker.getElement();
    } else {
      const icon = L.divIcon({
        className: 'dot-marker',
        html: `<div class="dot-marker-inner">${count > 1 ? count : ''}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const marker = L.marker(photo.position, { icon }).addTo(map).on('click', () => showLightbox(photo));
      markerElements[photo.id] = marker.getElement();
    }
  });
  return markerElements;
}

function showLightbox(photo) {
  const lb = document.getElementById('lightbox');
  lb.innerHTML = `
    <div class="lightbox-backdrop"></div>
    <div class="lightbox-content">
      <img src="${photo.full}" alt="${photo.caption}" />
      <div class="lightbox-info">
        <span class="lightbox-time">${photo.time}</span>
        <span class="lightbox-caption">${photo.caption}</span>
      </div>
      <button class="lightbox-close">×</button>
    </div>
  `;
  lb.classList.remove('hidden');
  lb.querySelector('.lightbox-backdrop').addEventListener('click', () => lb.classList.add('hidden'));
  lb.querySelector('.lightbox-close').addEventListener('click', () => lb.classList.add('hidden'));
}

// ─── Floating Switcher ───

function renderSwitcher() {
  let switcher = document.getElementById('prototype-switcher');
  if (switcher) switcher.remove();

  const current = getVariant();
  const keys = Object.keys(variants);
  const idx = keys.indexOf(current);

  switcher = document.createElement('div');
  switcher.id = 'prototype-switcher';
  switcher.innerHTML = `
    <button class="sw-arrow" data-dir="prev">←</button>
    <span class="sw-label">${current} — ${variants[current].name}</span>
    <button class="sw-arrow" data-dir="next">→</button>
  `;
  document.body.appendChild(switcher);

  switcher.querySelector('[data-dir="prev"]').addEventListener('click', () => {
    setVariant(keys[(idx - 1 + keys.length) % keys.length]);
  });
  switcher.querySelector('[data-dir="next"]').addEventListener('click', () => {
    setVariant(keys[(idx + 1) % keys.length]);
  });
}

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
  const keys = Object.keys(variants);
  const idx = keys.indexOf(getVariant());
  if (e.key === 'ArrowLeft') setVariant(keys[(idx - 1 + keys.length) % keys.length]);
  if (e.key === 'ArrowRight') setVariant(keys[(idx + 1) % keys.length]);
});

render();
