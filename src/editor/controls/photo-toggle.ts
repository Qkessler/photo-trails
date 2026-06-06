import type { PhotoCluster, PlacedPhoto } from "@core/types";
import type { EditorState } from "./editor-state";

export interface PhotoToggleCallbacks {
  onSelectionChange?: (photoId: string, selected: boolean) => void;
}

export class PhotoToggleOverlay {
  private state: EditorState;
  private callbacks: PhotoToggleCallbacks;
  private boundElements = new Map<string, HTMLElement>();

  constructor(state: EditorState, callbacks: PhotoToggleCallbacks = {}) {
    this.state = state;
    this.callbacks = callbacks;
  }

  attachToThumbnail(photoId: string, element: HTMLElement): void {
    this.boundElements.set(photoId, element);
    this.updateAppearance(photoId, element);

    element.addEventListener("click", (e) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      const selected = this.state.togglePhotoSelection(photoId);
      this.updateAppearance(photoId, element);
      this.callbacks.onSelectionChange?.(photoId, selected);
    });
  }

  detachAll(): void {
    this.boundElements.clear();
  }

  refreshAll(): void {
    for (const [photoId, el] of this.boundElements) {
      this.updateAppearance(photoId, el);
    }
  }

  private updateAppearance(photoId: string, element: HTMLElement): void {
    if (this.state.isSelected(photoId)) {
      element.classList.remove("photo--deselected");
    } else {
      element.classList.add("photo--deselected");
    }
  }
}
