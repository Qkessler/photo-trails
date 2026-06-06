import type { PhotoCluster, PlacedPhoto } from "@core/types";
import type { EditorState } from "./editor-state";

export interface HeroPickerCallbacks {
  onHeroChange?: (clusterIndex: number, heroIndex: number) => void;
}

export class HeroPicker {
  private state: EditorState;
  private callbacks: HeroPickerCallbacks;
  private container: HTMLElement | null = null;
  private activeClusterIndex: number | null = null;

  constructor(state: EditorState, callbacks: HeroPickerCallbacks = {}) {
    this.state = state;
    this.callbacks = callbacks;
  }

  show(
    cluster: PhotoCluster,
    clusterIndex: number,
    anchor: HTMLElement
  ): void {
    this.hide();
    this.activeClusterIndex = clusterIndex;

    this.container = document.createElement("div");
    this.container.className = "hero-picker";

    const currentHero = this.state.getHero(clusterIndex, cluster.heroIndex);

    cluster.photos.forEach((photo, idx) => {
      if (!this.state.isSelected(photo.photo.id)) return;

      const thumb = document.createElement("div");
      thumb.className = "hero-picker__thumb";
      if (idx === currentHero) {
        thumb.classList.add("hero-picker__thumb--active");
      }

      const img = document.createElement("img");
      img.src = `photos/thumb/${photo.photo.filename}`;
      img.alt = photo.photo.filename;
      thumb.appendChild(img);

      thumb.addEventListener("click", () => {
        this.state.setHero(clusterIndex, idx);
        this.callbacks.onHeroChange?.(clusterIndex, idx);
        this.show(cluster, clusterIndex, anchor);
      });

      this.container!.appendChild(thumb);
    });

    anchor.appendChild(this.container);
  }

  hide(): void {
    this.container?.remove();
    this.container = null;
    this.activeClusterIndex = null;
  }

  isVisible(): boolean {
    return this.container !== null;
  }

  getActiveClusterIndex(): number | null {
    return this.activeClusterIndex;
  }
}
