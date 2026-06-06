import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import type { PhotoCluster, PlacedPhoto, PhotoMetadata } from "../types";
import { Filmstrip } from "./filmstrip";

function makePlacedPhoto(id: string, timestamp: number): PlacedPhoto {
  const photo: PhotoMetadata = {
    id,
    filename: `${id}.jpg`,
    timestamp,
    lat: 47.6,
    lng: -122.3,
  };
  return {
    photo,
    lat: 47.6,
    lng: -122.3,
    routeTimestamp: timestamp,
    placementMethod: "gps",
  };
}

function makeCluster(photos: PlacedPhoto[], heroIndex = 0): PhotoCluster {
  return {
    photos,
    heroIndex,
    lat: photos[0].lat,
    lng: photos[0].lng,
    timestamp: photos[0].routeTimestamp,
  };
}

describe("Filmstrip", () => {
  let dom: JSDOM;
  let parent: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>");
    global.document = dom.window.document as unknown as Document;
    parent = dom.window.document.getElementById("root")!;
  });

  it("renders into the parent element", () => {
    const filmstrip = new Filmstrip(parent);
    expect(parent.querySelector(".filmstrip")).not.toBeNull();
    filmstrip.destroy();
  });

  it("renders single-photo clusters without a badge", () => {
    const filmstrip = new Filmstrip(parent);
    const photo = makePlacedPhoto("p1", 1000);
    filmstrip.setClusters([makeCluster([photo])]);

    const items = parent.querySelectorAll(".filmstrip__item");
    expect(items.length).toBe(1);
    expect(parent.querySelector(".filmstrip__badge")).toBeNull();
    filmstrip.destroy();
  });

  it("renders multi-photo clusters with a count badge", () => {
    const filmstrip = new Filmstrip(parent);
    const photos = [
      makePlacedPhoto("p1", 1000),
      makePlacedPhoto("p2", 2000),
      makePlacedPhoto("p3", 3000),
    ];
    filmstrip.setClusters([makeCluster(photos)]);

    const badge = parent.querySelector(".filmstrip__badge");
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toBe("3");
    filmstrip.destroy();
  });

  it("fires onPhotoClick for single-photo clusters", () => {
    const onClick = vi.fn();
    const filmstrip = new Filmstrip(parent, { onPhotoClick: onClick });
    const photo = makePlacedPhoto("p1", 1000);
    filmstrip.setClusters([makeCluster([photo])]);

    const item = parent.querySelector(".filmstrip__item") as HTMLElement;
    item.click();
    expect(onClick).toHaveBeenCalledWith(photo);
    filmstrip.destroy();
  });

  it("expands a cluster on click and shows fan items", () => {
    const onClusterClick = vi.fn();
    const filmstrip = new Filmstrip(parent, { onClusterClick });
    const photos = [makePlacedPhoto("p1", 1000), makePlacedPhoto("p2", 2000)];
    const cluster = makeCluster(photos);
    filmstrip.setClusters([cluster]);

    const item = parent.querySelector(".filmstrip__item") as HTMLElement;
    item.click();

    expect(onClusterClick).toHaveBeenCalledWith(cluster);
    const fanItems = parent.querySelectorAll(".filmstrip__item--fan");
    expect(fanItems.length).toBe(2);
    filmstrip.destroy();
  });

  it("collapses an expanded cluster", () => {
    const filmstrip = new Filmstrip(parent);
    const photos = [makePlacedPhoto("p1", 1000), makePlacedPhoto("p2", 2000)];
    filmstrip.setClusters([makeCluster(photos)]);

    const item = parent.querySelector(".filmstrip__item") as HTMLElement;
    item.click();

    const collapseBtn = parent.querySelector(".filmstrip__collapse-btn") as HTMLElement;
    collapseBtn.click();

    const fanItems = parent.querySelectorAll(".filmstrip__item--fan");
    expect(fanItems.length).toBe(0);
    expect(parent.querySelectorAll(".filmstrip__item").length).toBe(1);
    filmstrip.destroy();
  });

  it("fires onPhotoHover on mouseenter and null on mouseleave", () => {
    const onHover = vi.fn();
    const filmstrip = new Filmstrip(parent, { onPhotoHover: onHover });
    const photo = makePlacedPhoto("p1", 1000);
    filmstrip.setClusters([makeCluster([photo])]);

    const item = parent.querySelector(".filmstrip__item") as HTMLElement;
    item.dispatchEvent(new dom.window.Event("mouseenter"));
    expect(onHover).toHaveBeenCalledWith(photo);

    item.dispatchEvent(new dom.window.Event("mouseleave"));
    expect(onHover).toHaveBeenCalledWith(null);
    filmstrip.destroy();
  });

  it("renders clusters in chronological order", () => {
    const filmstrip = new Filmstrip(parent);
    const clusters = [
      makeCluster([makePlacedPhoto("early", 1000)]),
      makeCluster([makePlacedPhoto("mid", 5000)]),
      makeCluster([makePlacedPhoto("late", 9000)]),
    ];
    filmstrip.setClusters(clusters);

    const thumbs = parent.querySelectorAll(".filmstrip__thumb") as NodeListOf<HTMLImageElement>;
    expect(thumbs[0].alt).toBe("early.jpg");
    expect(thumbs[1].alt).toBe("mid.jpg");
    expect(thumbs[2].alt).toBe("late.jpg");
    filmstrip.destroy();
  });

  it("highlights a photo by adding active class", () => {
    const filmstrip = new Filmstrip(parent);
    const photo = makePlacedPhoto("p1", 1000);
    filmstrip.setClusters([makeCluster([photo])]);

    filmstrip.highlightPhoto(photo);
    expect(parent.querySelector(".filmstrip__item--active")).not.toBeNull();

    filmstrip.highlightPhoto(null);
    expect(parent.querySelector(".filmstrip__item--active")).toBeNull();
    filmstrip.destroy();
  });

  it("marks the hero photo in an expanded cluster", () => {
    const filmstrip = new Filmstrip(parent);
    const photos = [makePlacedPhoto("p1", 1000), makePlacedPhoto("p2", 2000)];
    filmstrip.setClusters([makeCluster(photos, 1)]);

    const item = parent.querySelector(".filmstrip__item") as HTMLElement;
    item.click();

    const heroItems = parent.querySelectorAll(".filmstrip__item--hero");
    expect(heroItems.length).toBe(1);
    filmstrip.destroy();
  });

  it("renders nothing when given an empty clusters array", () => {
    const filmstrip = new Filmstrip(parent);
    filmstrip.setClusters([]);

    expect(parent.querySelectorAll(".filmstrip__item").length).toBe(0);
    filmstrip.destroy();
  });

  it("destroy removes the element from the DOM", () => {
    const filmstrip = new Filmstrip(parent);
    expect(parent.querySelector(".filmstrip")).not.toBeNull();
    filmstrip.destroy();
    expect(parent.querySelector(".filmstrip")).toBeNull();
  });

  it("setClusters replaces previous content", () => {
    const filmstrip = new Filmstrip(parent);
    filmstrip.setClusters([makeCluster([makePlacedPhoto("a", 1000)])]);
    expect(parent.querySelectorAll(".filmstrip__item").length).toBe(1);

    filmstrip.setClusters([
      makeCluster([makePlacedPhoto("b", 2000)]),
      makeCluster([makePlacedPhoto("c", 3000)]),
    ]);
    expect(parent.querySelectorAll(".filmstrip__item").length).toBe(2);
    filmstrip.destroy();
  });

  it("fires onPhotoClick for individual photo inside expanded cluster", () => {
    const onClick = vi.fn();
    const filmstrip = new Filmstrip(parent, { onPhotoClick: onClick });
    const photos = [makePlacedPhoto("p1", 1000), makePlacedPhoto("p2", 2000)];
    filmstrip.setClusters([makeCluster(photos)]);

    const clusterItem = parent.querySelector(".filmstrip__item") as HTMLElement;
    clusterItem.click();

    const fanItems = parent.querySelectorAll(".filmstrip__item--fan");
    (fanItems[1] as HTMLElement).click();
    expect(onClick).toHaveBeenCalledWith(photos[1]);
    filmstrip.destroy();
  });

  it("only one cluster is expanded at a time", () => {
    const filmstrip = new Filmstrip(parent);
    const cluster1 = makeCluster([makePlacedPhoto("a", 1000), makePlacedPhoto("b", 2000)]);
    const cluster2 = makeCluster([makePlacedPhoto("c", 5000), makePlacedPhoto("d", 6000)]);
    filmstrip.setClusters([cluster1, cluster2]);

    const items = parent.querySelectorAll(".filmstrip__item");
    (items[0] as HTMLElement).click();
    expect(parent.querySelectorAll(".filmstrip__fan").length).toBe(1);

    // Clicking second cluster collapses first (re-render with new expanded index)
    const updatedItems = parent.querySelectorAll(".filmstrip__item--cluster");
    (updatedItems[0] as HTMLElement).click();
    expect(parent.querySelectorAll(".filmstrip__fan").length).toBe(1);
    filmstrip.destroy();
  });
});
