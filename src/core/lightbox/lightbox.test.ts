import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Lightbox, createLightbox } from "./lightbox";
import type { PlacedPhoto, PhotoCluster } from "../types";

function makePlacedPhoto(id: string, index = 0): PlacedPhoto {
  return {
    photo: {
      id,
      filename: `${id}.jpg`,
      timestamp: 1700000000000 + index * 60000,
      lat: 47.6 + index * 0.001,
      lng: -122.3 + index * 0.001,
    },
    lat: 47.6 + index * 0.001,
    lng: -122.3 + index * 0.001,
    routeTimestamp: 1700000000000 + index * 60000,
    placementMethod: "gps",
  };
}

describe("Lightbox", () => {
  let lightbox: Lightbox;

  beforeEach(() => {
    lightbox = createLightbox();
  });

  afterEach(() => {
    lightbox.close();
  });

  it("does not open with an empty photo array", () => {
    lightbox.open([]);
    expect(lightbox.isOpen).toBe(false);
  });

  it("opens and renders overlay into DOM", () => {
    const photos = [makePlacedPhoto("a", 0)];
    lightbox.open(photos);

    expect(lightbox.isOpen).toBe(true);
    const overlay = document.querySelector(".lightbox");
    expect(overlay).not.toBeNull();
  });

  it("shows correct counter text", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1), makePlacedPhoto("c", 2)];
    lightbox.open(photos, 1);

    const counter = document.querySelector(".lightbox__counter");
    expect(counter?.textContent).toBe("2 / 3");
  });

  it("navigates forward with next()", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 0);

    lightbox.next();
    expect(lightbox.activeIndex).toBe(1);
    expect(lightbox.activePhoto?.photo.id).toBe("b");
  });

  it("wraps around at the end", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 1);

    lightbox.next();
    expect(lightbox.activeIndex).toBe(0);
  });

  it("navigates backward with prev()", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 0);

    lightbox.prev();
    expect(lightbox.activeIndex).toBe(1);
  });

  it("closes and removes overlay from DOM", () => {
    lightbox.open([makePlacedPhoto("a", 0)]);
    lightbox.close();

    expect(lightbox.isOpen).toBe(false);
    expect(document.querySelector(".lightbox")).toBeNull();
  });

  it("responds to ArrowRight key", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 0);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(lightbox.activeIndex).toBe(1);
  });

  it("responds to ArrowLeft key", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 1);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(lightbox.activeIndex).toBe(0);
  });

  it("closes on Escape key", () => {
    lightbox.open([makePlacedPhoto("a", 0)]);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(lightbox.isOpen).toBe(false);
  });

  it("calls onClose callback", () => {
    let closed = false;
    lightbox = createLightbox({ onClose: () => { closed = true; } });
    lightbox.open([makePlacedPhoto("a", 0)]);
    lightbox.close();
    expect(closed).toBe(true);
  });

  it("calls onNavigate callback", () => {
    const navigated: number[] = [];
    lightbox = createLightbox({ onNavigate: (_, idx) => { navigated.push(idx); } });
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 0);
    lightbox.next();

    expect(navigated).toEqual([0, 1]);
  });

  it("clamps startIndex to valid range", () => {
    const photos = [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1)];
    lightbox.open(photos, 99);
    expect(lightbox.activeIndex).toBe(1);
  });

  it("opens from cluster using hero index", () => {
    const cluster: PhotoCluster = {
      photos: [makePlacedPhoto("a", 0), makePlacedPhoto("b", 1), makePlacedPhoto("c", 2)],
      heroIndex: 2,
      lat: 47.6,
      lng: -122.3,
      timestamp: 1700000000000,
    };
    lightbox.openCluster(cluster);
    expect(lightbox.activeIndex).toBe(2);
    expect(lightbox.activePhoto?.photo.id).toBe("c");
  });

  it("lazy-loads display image by setting src", () => {
    lightbox = createLightbox({ displayBaseUrl: "photos/display" });
    lightbox.open([makePlacedPhoto("photo1", 0)]);

    const img = document.querySelector(".lightbox__img") as HTMLImageElement;
    expect(img.src).toContain("photos/display/photo1.jpg");
  });

  it("hides nav buttons when only one photo", () => {
    lightbox.open([makePlacedPhoto("a", 0)]);

    const prev = document.querySelector(".lightbox__nav--prev") as HTMLElement;
    const next = document.querySelector(".lightbox__nav--next") as HTMLElement;
    expect(prev.style.visibility).toBe("hidden");
    expect(next.style.visibility).toBe("hidden");
  });

  it("closes when clicking the overlay background", () => {
    lightbox.open([makePlacedPhoto("a", 0)]);

    const overlay = document.querySelector(".lightbox") as HTMLElement;
    overlay.click();
    expect(lightbox.isOpen).toBe(false);
  });
});
