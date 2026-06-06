import { describe, it, expect, beforeEach } from "vitest";
import { EditorState } from "./editor-state";
import type { ActivityData, PhotoCluster, PlacedPhoto } from "@core/types";

function makePlacedPhoto(id: string): PlacedPhoto {
  return {
    photo: { id, filename: `${id}.jpg`, timestamp: Date.now(), lat: 47, lng: -122 },
    lat: 47,
    lng: -122,
    routeTimestamp: Date.now(),
    placementMethod: "gps",
  };
}

function makeCluster(photoIds: string[], heroIndex = 0): PhotoCluster {
  const photos = photoIds.map(makePlacedPhoto);
  return {
    photos,
    heroIndex,
    lat: photos[0].lat,
    lng: photos[0].lng,
    timestamp: photos[0].routeTimestamp,
  };
}

describe("EditorState", () => {
  let state: EditorState;

  beforeEach(() => {
    state = new EditorState();
  });

  describe("photo selection", () => {
    it("starts with all photos selected", () => {
      expect(state.isSelected("photo-1")).toBe(true);
    });

    it("toggles photo deselection", () => {
      state.togglePhotoSelection("photo-1");
      expect(state.isSelected("photo-1")).toBe(false);
    });

    it("toggles back to selected", () => {
      state.togglePhotoSelection("photo-1");
      state.togglePhotoSelection("photo-1");
      expect(state.isSelected("photo-1")).toBe(true);
    });
  });

  describe("hero picker", () => {
    it("returns default hero when no override", () => {
      expect(state.getHero(0, 2)).toBe(2);
    });

    it("overrides hero index", () => {
      state.setHero(0, 3);
      expect(state.getHero(0, 0)).toBe(3);
    });
  });

  describe("subscribe", () => {
    it("notifies listeners on photo toggle", () => {
      const snapshots: any[] = [];
      state.subscribe((s) => snapshots.push(s));
      state.togglePhotoSelection("x");
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].deselectedPhotoIds.has("x")).toBe(true);
    });

    it("notifies listeners on hero change", () => {
      const snapshots: any[] = [];
      state.subscribe((s) => snapshots.push(s));
      state.setHero(1, 2);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].heroOverrides.get(1)).toBe(2);
    });

    it("returns unsubscribe function", () => {
      const snapshots: any[] = [];
      const unsub = state.subscribe((s) => snapshots.push(s));
      unsub();
      state.togglePhotoSelection("x");
      expect(snapshots).toHaveLength(0);
    });
  });

  describe("applyToActivity", () => {
    it("filters out deselected photos", () => {
      const activity: ActivityData = {
        segments: [],
        clusters: [makeCluster(["a", "b", "c"])],
        unplaced: [],
      };
      state.togglePhotoSelection("b");
      const result = state.applyToActivity(activity);
      expect(result.clusters[0].photos).toHaveLength(2);
      expect(result.clusters[0].photos.map((p) => p.photo.id)).toEqual(["a", "c"]);
    });

    it("removes empty clusters", () => {
      const activity: ActivityData = {
        segments: [],
        clusters: [makeCluster(["a"])],
        unplaced: [],
      };
      state.togglePhotoSelection("a");
      const result = state.applyToActivity(activity);
      expect(result.clusters).toHaveLength(0);
    });

    it("clamps hero index when photos are removed", () => {
      const activity: ActivityData = {
        segments: [],
        clusters: [makeCluster(["a", "b", "c"], 2)],
        unplaced: [],
      };
      state.togglePhotoSelection("c");
      const result = state.applyToActivity(activity);
      expect(result.clusters[0].heroIndex).toBe(1);
    });

    it("applies hero overrides", () => {
      const activity: ActivityData = {
        segments: [],
        clusters: [makeCluster(["a", "b", "c"])],
        unplaced: [],
      };
      state.setHero(0, 2);
      const result = state.applyToActivity(activity);
      expect(result.clusters[0].heroIndex).toBe(2);
    });
  });
});
