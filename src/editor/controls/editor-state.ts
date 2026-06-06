import type { ActivityData, PhotoCluster, PlacedPhoto } from "@core/types";

export interface EditorStateSnapshot {
  deselectedPhotoIds: Set<string>;
  heroOverrides: Map<number, number>; // clusterIndex -> heroIndex
}

export type EditorStateListener = (snapshot: EditorStateSnapshot) => void;

export class EditorState {
  private deselectedPhotoIds = new Set<string>();
  private heroOverrides = new Map<number, number>();
  private listeners = new Set<EditorStateListener>();

  togglePhotoSelection(photoId: string): boolean {
    if (this.deselectedPhotoIds.has(photoId)) {
      this.deselectedPhotoIds.delete(photoId);
    } else {
      this.deselectedPhotoIds.add(photoId);
    }
    this.notify();
    return !this.deselectedPhotoIds.has(photoId);
  }

  isSelected(photoId: string): boolean {
    return !this.deselectedPhotoIds.has(photoId);
  }

  setHero(clusterIndex: number, heroIndex: number): void {
    this.heroOverrides.set(clusterIndex, heroIndex);
    this.notify();
  }

  getHero(clusterIndex: number, defaultHero: number): number {
    return this.heroOverrides.get(clusterIndex) ?? defaultHero;
  }

  getSnapshot(): EditorStateSnapshot {
    return {
      deselectedPhotoIds: new Set(this.deselectedPhotoIds),
      heroOverrides: new Map(this.heroOverrides),
    };
  }

  applyToActivity(activity: ActivityData): ActivityData {
    const clusters: PhotoCluster[] = activity.clusters
      .map((cluster, idx) => {
        const photos = cluster.photos.filter(
          (p) => !this.deselectedPhotoIds.has(p.photo.id)
        );
        if (photos.length === 0) return null;

        const heroIndex = Math.min(
          this.getHero(idx, cluster.heroIndex),
          photos.length - 1
        );
        return { ...cluster, photos, heroIndex };
      })
      .filter((c): c is PhotoCluster => c !== null);

    return { ...activity, clusters };
  }

  subscribe(listener: EditorStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
