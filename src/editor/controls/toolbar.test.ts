import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { EditorState } from "./editor-state";
import { Toolbar } from "./toolbar";

describe("Toolbar", () => {
  let dom: JSDOM;
  let parent: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"app\"></div></body></html>");
    global.document = dom.window.document as any;
    parent = dom.window.document.getElementById("app")!;
  });

  it("renders drop zone and export button", () => {
    const state = new EditorState();
    const toolbar = new Toolbar(parent, state);
    const el = toolbar.getElement();
    expect(el.querySelector(".editor-toolbar__drop-zone")).not.toBeNull();
    expect(el.querySelector(".editor-toolbar__export-btn")).not.toBeNull();
  });

  it("calls onExport when export button is clicked", () => {
    const state = new EditorState();
    const onExport = vi.fn();
    const toolbar = new Toolbar(parent, state, { onExport });
    const btn = toolbar.getElement().querySelector(".editor-toolbar__export-btn") as HTMLElement;
    btn.click();
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("calls onGpxImport on drop with .gpx file", () => {
    const state = new EditorState();
    const onGpxImport = vi.fn();
    const toolbar = new Toolbar(parent, state, { onGpxImport });
    const zone = toolbar.getElement().querySelector(".editor-toolbar__drop-zone") as HTMLElement;

    const file = new dom.window.File(["<gpx></gpx>"], "track.gpx", { type: "application/gpx+xml" }) as any;
    const dropEvent = new dom.window.Event("drop", { bubbles: true }) as any;
    dropEvent.preventDefault = vi.fn();
    dropEvent.dataTransfer = { files: [file] };
    zone.dispatchEvent(dropEvent);

    expect(onGpxImport).toHaveBeenCalledWith(file);
  });

  it("destroy removes element from parent", () => {
    const state = new EditorState();
    const toolbar = new Toolbar(parent, state);
    expect(parent.querySelector(".editor-toolbar")).not.toBeNull();
    toolbar.destroy();
    expect(parent.querySelector(".editor-toolbar")).toBeNull();
  });
});
