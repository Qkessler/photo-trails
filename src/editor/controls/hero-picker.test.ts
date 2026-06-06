import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { EditorState } from "./editor-state";
import { HeroPicker } from "./hero-picker";
import type { PhotoCluster, PlacedPhoto } from "@core/types";

function makePlacedPhoto(id: string): PlacedPhoto {
  return {
    photo: { id, filename: `${id}.jpg`, timestamp: Date.now(), lat: 47, lng: -122 },
    lat: 47,
    lng: -122,
    routeTimestamp: Date.now(),
    placementMethod: "gps",
  };
}

function makeCluster(ids: string[], heroIndex = 0): PhotoCluster {
  const photos = ids.map(makePlacedPhoto);
  return { photos, heroIndex, lat: 47, lng: -122, timestamp: Date.now() };
}

describe("HeroPicker", () => {
  let dom: JSDOM;
  let state: EditorState;
  let picker: HeroPicker;
  let anchor: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"anchor\"></div></body></html>");
    global.document = dom.window.document as any;
    anchor = dom.window.document.getElementById("anchor")!;
    state = new EditorState();
    picker = new HeroPicker(state);
  });

  it("renders thumbnails for each selected photo in the cluster", () => {
    const cluster = makeCluster(["a", "b", "c"]);
    picker.show(cluster, 0, anchor);

    const thumbs = anchor.querySelectorAll(".hero-picker__thumb");
    expect(thumbs).toHaveLength(3);
  });

  it("marks the current hero as active", () => {
    const cluster = makeCluster(["a", "b", "c"]);
    state.setHero(0, 1);
    picker.show(cluster, 0, anchor);

    const thumbs = anchor.querySelectorAll(".hero-picker__thumb");
    expect(thumbs[0].classList.contains("hero-picker__thumb--active")).toBe(false);
    expect(thumbs[1].classList.contains("hero-picker__thumb--active")).toBe(true);
  });

  it("clicking a thumbnail updates the hero in state", () => {
    const cluster = makeCluster(["a", "b", "c"]);
    picker.show(cluster, 0, anchor);

    const thumbs = anchor.querySelectorAll(".hero-picker__thumb");
    (thumbs[2] as HTMLElement).click();

    expect(state.getHero(0, 0)).toBe(2);
  });

  it("fires onHeroChange callback on click", () => {
    const onHeroChange = vi.fn();
    picker = new HeroPicker(state, { onHeroChange });
    const cluster = makeCluster(["a", "b"]);
    picker.show(cluster, 3, anchor);

    const thumbs = anchor.querySelectorAll(".hero-picker__thumb");
    (thumbs[1] as HTMLElement).click();

    expect(onHeroChange).toHaveBeenCalledWith(3, 1);
  });

  it("skips deselected photos", () => {
    state.togglePhotoSelection("b");
    const cluster = makeCluster(["a", "b", "c"]);
    picker.show(cluster, 0, anchor);

    const thumbs = anchor.querySelectorAll(".hero-picker__thumb");
    expect(thumbs).toHaveLength(2);
  });

  it("hide removes the picker from the DOM", () => {
    const cluster = makeCluster(["a", "b"]);
    picker.show(cluster, 0, anchor);
    expect(anchor.querySelector(".hero-picker")).not.toBeNull();

    picker.hide();
    expect(anchor.querySelector(".hero-picker")).toBeNull();
    expect(picker.isVisible()).toBe(false);
  });
});
