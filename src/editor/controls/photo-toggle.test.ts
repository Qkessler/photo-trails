import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { EditorState } from "./editor-state";
import { PhotoToggleOverlay } from "./photo-toggle";

describe("PhotoToggleOverlay", () => {
  let dom: JSDOM;
  let state: EditorState;
  let overlay: PhotoToggleOverlay;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    global.document = dom.window.document as any;
    state = new EditorState();
    overlay = new PhotoToggleOverlay(state);
  });

  function makeThumb(): HTMLElement {
    const el = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(el);
    return el;
  }

  function shiftClick(el: HTMLElement): void {
    const event = new dom.window.MouseEvent("click", { bubbles: true, shiftKey: true });
    el.dispatchEvent(event);
  }

  it("shift+click deselects a photo and adds deselected class", () => {
    const el = makeThumb();
    overlay.attachToThumbnail("p1", el);

    shiftClick(el);

    expect(state.isSelected("p1")).toBe(false);
    expect(el.classList.contains("photo--deselected")).toBe(true);
  });

  it("shift+click again re-selects the photo", () => {
    const el = makeThumb();
    overlay.attachToThumbnail("p1", el);

    shiftClick(el);
    shiftClick(el);

    expect(state.isSelected("p1")).toBe(true);
    expect(el.classList.contains("photo--deselected")).toBe(false);
  });

  it("normal click without shift does not toggle", () => {
    const el = makeThumb();
    overlay.attachToThumbnail("p1", el);

    const event = new dom.window.MouseEvent("click", { bubbles: true, shiftKey: false });
    el.dispatchEvent(event);

    expect(state.isSelected("p1")).toBe(true);
    expect(el.classList.contains("photo--deselected")).toBe(false);
  });

  it("fires onSelectionChange callback", () => {
    const onSelectionChange = vi.fn();
    overlay = new PhotoToggleOverlay(state, { onSelectionChange });
    const el = makeThumb();
    overlay.attachToThumbnail("p1", el);

    shiftClick(el);

    expect(onSelectionChange).toHaveBeenCalledWith("p1", false);
  });

  it("refreshAll updates all bound elements", () => {
    const el1 = makeThumb();
    const el2 = makeThumb();
    overlay.attachToThumbnail("p1", el1);
    overlay.attachToThumbnail("p2", el2);

    state.togglePhotoSelection("p2");
    overlay.refreshAll();

    expect(el1.classList.contains("photo--deselected")).toBe(false);
    expect(el2.classList.contains("photo--deselected")).toBe(true);
  });
});
