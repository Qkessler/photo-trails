import type { PlacedPhoto, PhotoCluster } from "../types";

export interface LightboxOptions {
  displayBaseUrl?: string;
  onClose?: () => void;
  onNavigate?: (photo: PlacedPhoto, index: number) => void;
}

const SWIPE_THRESHOLD = 50;

export class Lightbox {
  private options: LightboxOptions;
  private photos: PlacedPhoto[] = [];
  private currentIndex = 0;
  private overlay: HTMLElement | null = null;
  private imgEl: HTMLImageElement | null = null;
  private touchStartX = 0;
  private boundKeyHandler = this.handleKeydown.bind(this);

  constructor(options: LightboxOptions = {}) {
    this.options = options;
  }

  open(photos: PlacedPhoto[], startIndex = 0): void {
    if (photos.length === 0) return;

    this.photos = photos;
    this.currentIndex = Math.max(0, Math.min(startIndex, photos.length - 1));

    this.createDOM();
    this.showCurrent();
    document.addEventListener("keydown", this.boundKeyHandler);
  }

  openCluster(cluster: PhotoCluster, startIndex?: number): void {
    this.open(cluster.photos, startIndex ?? cluster.heroIndex);
  }

  close(): void {
    document.removeEventListener("keydown", this.boundKeyHandler);
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.imgEl = null;
    }
    this.options.onClose?.();
  }

  next(): void {
    if (this.photos.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.photos.length;
    this.showCurrent();
  }

  prev(): void {
    if (this.photos.length === 0) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.photos.length) % this.photos.length;
    this.showCurrent();
  }

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  get activeIndex(): number {
    return this.currentIndex;
  }

  get activePhoto(): PlacedPhoto | null {
    return this.photos[this.currentIndex] ?? null;
  }

  private createDOM(): void {
    if (this.overlay) this.overlay.remove();

    this.overlay = document.createElement("div");
    this.overlay.className = "lightbox";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-label", "Photo lightbox");

    this.overlay.innerHTML = `
      <button class="lightbox__close" aria-label="Close">&times;</button>
      <button class="lightbox__nav lightbox__nav--prev" aria-label="Previous photo">&#8249;</button>
      <div class="lightbox__content">
        <img class="lightbox__img" alt="" />
      </div>
      <button class="lightbox__nav lightbox__nav--next" aria-label="Next photo">&#8250;</button>
      <div class="lightbox__counter"></div>
    `;

    this.imgEl = this.overlay.querySelector(".lightbox__img");

    this.overlay
      .querySelector(".lightbox__close")!
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".lightbox__nav--prev")!
      .addEventListener("click", () => this.prev());
    this.overlay
      .querySelector(".lightbox__nav--next")!
      .addEventListener("click", () => this.next());

    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    const content = this.overlay.querySelector(".lightbox__content")!;
    content.addEventListener("touchstart", (e) => this.handleTouchStart(e as TouchEvent), { passive: true });
    content.addEventListener("touchend", (e) => this.handleTouchEnd(e as TouchEvent), { passive: true });

    document.body.appendChild(this.overlay);
  }

  private showCurrent(): void {
    const photo = this.photos[this.currentIndex];
    if (!photo || !this.imgEl || !this.overlay) return;

    const base = this.options.displayBaseUrl ?? "photos/display";
    const src = `${base}/${photo.photo.id}.jpg`;

    this.imgEl.src = "";
    this.imgEl.alt = photo.photo.filename;
    this.imgEl.src = src;

    const counter = this.overlay.querySelector(".lightbox__counter");
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.photos.length}`;
    }

    const prevBtn = this.overlay.querySelector(".lightbox__nav--prev") as HTMLElement;
    const nextBtn = this.overlay.querySelector(".lightbox__nav--next") as HTMLElement;
    if (prevBtn) prevBtn.style.visibility = this.photos.length > 1 ? "visible" : "hidden";
    if (nextBtn) nextBtn.style.visibility = this.photos.length > 1 ? "visible" : "hidden";

    this.options.onNavigate?.(photo, this.currentIndex);
  }

  private handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case "Escape":
        this.close();
        break;
      case "ArrowLeft":
        this.prev();
        break;
      case "ArrowRight":
        this.next();
        break;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.touchStartX = e.touches[0].clientX;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - this.touchStartX;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) this.next();
      else this.prev();
    }
  }
}

export function createLightbox(options?: LightboxOptions): Lightbox {
  return new Lightbox(options);
}
