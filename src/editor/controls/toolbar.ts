import type { PhotoCluster, PlacedPhoto } from "@core/types";
import type { EditorState } from "./editor-state";

export interface ToolbarCallbacks {
  onGpxImport?: (file: File) => void;
  onExport?: () => void;
}

export class Toolbar {
  private container: HTMLElement;
  private state: EditorState;
  private callbacks: ToolbarCallbacks;
  private dropZone: HTMLElement;

  constructor(
    parent: HTMLElement,
    state: EditorState,
    callbacks: ToolbarCallbacks = {}
  ) {
    this.state = state;
    this.callbacks = callbacks;

    this.container = document.createElement("div");
    this.container.className = "editor-toolbar";

    this.dropZone = this.createDropZone();
    this.container.appendChild(this.dropZone);
    this.container.appendChild(this.createExportButton());

    parent.appendChild(this.container);
  }

  getElement(): HTMLElement {
    return this.container;
  }

  destroy(): void {
    this.container.remove();
  }

  private createDropZone(): HTMLElement {
    const zone = document.createElement("div");
    zone.className = "editor-toolbar__drop-zone";
    zone.textContent = "Drop GPX file here";

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("editor-toolbar__drop-zone--active");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("editor-toolbar__drop-zone--active");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("editor-toolbar__drop-zone--active");
      const file = e.dataTransfer?.files[0];
      if (file && file.name.endsWith(".gpx")) {
        this.callbacks.onGpxImport?.(file);
      }
    });

    zone.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".gpx";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (file) this.callbacks.onGpxImport?.(file);
      });
      input.click();
    });

    return zone;
  }

  private createExportButton(): HTMLElement {
    const btn = document.createElement("button");
    btn.className = "editor-toolbar__export-btn";
    btn.textContent = "Export";
    btn.addEventListener("click", () => this.callbacks.onExport?.());
    return btn;
  }
}
