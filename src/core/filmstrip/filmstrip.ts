import type { PhotoCluster, PlacedPhoto } from "../types";

export interface FilmstripCallbacks {
  onPhotoHover?: (photo: PlacedPhoto | null) => void;
  onPhotoClick?: (photo: PlacedPhoto) => void;
  onClusterClick?: (cluster: PhotoCluster) => void;
}

interface FilmstripState {
  clusters: PhotoCluster[];
  expandedClusterIndex: number | null;
}

export class Filmstrip {
  private container: HTMLElement;
  private strip: HTMLElement;
  private state: FilmstripState = { clusters: [], expandedClusterIndex: null };
  private callbacks: FilmstripCallbacks;
  private isDragging = false;
  private dragStartX = 0;
  private scrollStartX = 0;

  constructor(parent: HTMLElement, callbacks: FilmstripCallbacks = {}) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.container.className = "filmstrip";

    this.strip = document.createElement("div");
    this.strip.className = "filmstrip__strip";

    this.container.appendChild(this.strip);
    parent.appendChild(this.container);

    this.bindScrollEvents();
  }

  setClusters(clusters: PhotoCluster[]): void {
    this.state = { clusters, expandedClusterIndex: null };
    this.render();
  }

  destroy(): void {
    this.container.remove();
  }

  getElement(): HTMLElement {
    return this.container;
  }

  private render(): void {
    this.strip.innerHTML = "";
    const { clusters, expandedClusterIndex } = this.state;

    clusters.forEach((cluster, clusterIdx) => {
      if (expandedClusterIndex === clusterIdx) {
        this.renderExpandedCluster(cluster, clusterIdx);
      } else {
        this.renderCollapsedCluster(cluster, clusterIdx);
      }
    });
  }

  private renderCollapsedCluster(cluster: PhotoCluster, clusterIdx: number): void {
    const item = document.createElement("div");
    item.className = "filmstrip__item";
    if (cluster.photos.length > 1) {
      item.classList.add("filmstrip__item--cluster");
    }

    const thumb = this.createThumbnail(cluster.photos[cluster.heroIndex]);
    item.appendChild(thumb);

    if (cluster.photos.length > 1) {
      const badge = document.createElement("span");
      badge.className = "filmstrip__badge";
      badge.textContent = String(cluster.photos.length);
      item.appendChild(badge);
    }

    item.addEventListener("mouseenter", () => {
      this.callbacks.onPhotoHover?.(cluster.photos[cluster.heroIndex]);
    });
    item.addEventListener("mouseleave", () => {
      this.callbacks.onPhotoHover?.(null);
    });

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      if (cluster.photos.length > 1) {
        this.expandCluster(clusterIdx);
        this.callbacks.onClusterClick?.(cluster);
      } else {
        this.callbacks.onPhotoClick?.(cluster.photos[0]);
      }
    });

    this.strip.appendChild(item);
  }

  private renderExpandedCluster(cluster: PhotoCluster, clusterIdx: number): void {
    const group = document.createElement("div");
    group.className = "filmstrip__fan";

    cluster.photos.forEach((photo, photoIdx) => {
      const item = document.createElement("div");
      item.className = "filmstrip__item filmstrip__item--fan";
      if (photoIdx === cluster.heroIndex) {
        item.classList.add("filmstrip__item--hero");
      }

      const thumb = this.createThumbnail(photo);
      item.appendChild(thumb);

      item.addEventListener("mouseenter", () => {
        this.callbacks.onPhotoHover?.(photo);
      });
      item.addEventListener("mouseleave", () => {
        this.callbacks.onPhotoHover?.(null);
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.callbacks.onPhotoClick?.(photo);
      });

      group.appendChild(item);
    });

    const collapseBtn = document.createElement("button");
    collapseBtn.className = "filmstrip__collapse-btn";
    collapseBtn.textContent = "×";
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collapseCluster();
    });
    group.appendChild(collapseBtn);

    this.strip.appendChild(group);
  }

  private createThumbnail(photo: PlacedPhoto): HTMLElement {
    const img = document.createElement("img");
    img.className = "filmstrip__thumb";
    img.src = this.getThumbnailUrl(photo);
    img.alt = photo.photo.filename;
    img.loading = "lazy";
    img.draggable = false;
    return img;
  }

  private getThumbnailUrl(photo: PlacedPhoto): string {
    return `photos/thumbs/${photo.photo.id}.jpg`;
  }

  private expandCluster(index: number): void {
    this.state.expandedClusterIndex = index;
    this.render();
  }

  private collapseCluster(): void {
    this.state.expandedClusterIndex = null;
    this.render();
  }

  private bindScrollEvents(): void {
    this.strip.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.strip.scrollLeft += e.deltaY;
    }, { passive: false });

    this.strip.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.scrollStartX = this.strip.scrollLeft;
      this.strip.classList.add("filmstrip__strip--dragging");
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.dragStartX;
      this.strip.scrollLeft = this.scrollStartX - dx;
    });

    document.addEventListener("mouseup", () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.strip.classList.remove("filmstrip__strip--dragging");
    });
  }

  scrollToPhoto(photo: PlacedPhoto): void {
    const thumbs = this.strip.querySelectorAll(".filmstrip__thumb");
    for (const thumb of thumbs) {
      if ((thumb as HTMLImageElement).alt === photo.photo.filename) {
        thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        break;
      }
    }
  }

  highlightPhoto(photo: PlacedPhoto | null): void {
    this.strip.querySelectorAll(".filmstrip__item--active").forEach((el) => {
      el.classList.remove("filmstrip__item--active");
    });
    if (!photo) return;

    const items = this.strip.querySelectorAll(".filmstrip__item");
    for (const item of items) {
      const img = item.querySelector(".filmstrip__thumb") as HTMLImageElement | null;
      if (img?.alt === photo.photo.filename) {
        item.classList.add("filmstrip__item--active");
        break;
      }
    }
  }
}
