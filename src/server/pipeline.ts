import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { parseGPX } from "../core/gpx-parser.js";
import { matchPhotosToRoute } from "../core/photo-route-matcher.js";
import { clusterPhotos } from "../core/photo-clusterer.js";
import { queryPhotos, PhotosBridgeError } from "./photos-bridge.js";
import { extractMetadata } from "./photos-manual.js";
import { exportStatic } from "./static-exporter.js";
import type { ActivityData, PhotoMetadata, RouteSegment } from "../core/types.js";

export interface PipelineState {
  segments: RouteSegment[];
  photos: PhotoMetadata[];
  activity: ActivityData;
  photoSourceDir: string;
}

export interface ImportGPXResult {
  state: PipelineState;
  photoSource: "apple-photos" | "manual-fallback";
  warnings: string[];
}

const CLUSTER_WINDOW_SECONDS = 30;
const BUFFER_MINUTES = 10;

export async function importGPX(
  gpxString: string,
  manualPhotos?: { buffer: Buffer; filename: string }[],
): Promise<ImportGPXResult> {
  const { trackpoints, segments } = parseGPX(gpxString);

  if (trackpoints.length === 0) {
    throw new PipelineError("GPX file contains no valid trackpoints.", "EMPTY_GPX");
  }

  const routeStart = trackpoints[0].timestamp;
  const routeEnd = trackpoints[trackpoints.length - 1].timestamp;
  const warnings: string[] = [];

  let photos: PhotoMetadata[];
  let photoSourceDir: string;
  let photoSource: "apple-photos" | "manual-fallback";

  if (manualPhotos && manualPhotos.length > 0) {
    const result = await importManualPhotos(manualPhotos);
    photos = result.photos;
    photoSourceDir = result.exportDir;
    photoSource = "manual-fallback";
  } else {
    try {
      const result = await queryPhotos({ startTime: routeStart, endTime: routeEnd, bufferMinutes: BUFFER_MINUTES });
      photos = result.photos;
      photoSourceDir = result.exportDir;
      photoSource = "apple-photos";
    } catch (err) {
      if (err instanceof PhotosBridgeError && err.code === "NO_PHOTOS") {
        warnings.push("No photos found in Apple Photos for this time range.");
        photos = [];
        photoSourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "photos-on-trails-empty-"));
        photoSource = "apple-photos";
      } else if (err instanceof PhotosBridgeError && err.code === "PERMISSION_DENIED") {
        warnings.push("Apple Photos access denied. Drop photos manually or grant Automation permission.");
        photos = [];
        photoSourceDir = await fs.mkdtemp(path.join(os.tmpdir(), "photos-on-trails-empty-"));
        photoSource = "apple-photos";
      } else {
        throw err;
      }
    }
  }

  const activity = buildActivity(trackpoints, segments, photos);

  return {
    state: { segments, photos, activity, photoSourceDir },
    photoSource,
    warnings,
  };
}

export function buildActivity(
  trackpoints: import("../core/types.js").Trackpoint[],
  segments: RouteSegment[],
  photos: PhotoMetadata[],
): ActivityData {
  const { placed, unplaced } = matchPhotosToRoute(trackpoints, photos, BUFFER_MINUTES);
  const clusters = clusterPhotos(placed, CLUSTER_WINDOW_SECONDS);
  return { segments, clusters, unplaced };
}

async function importManualPhotos(
  files: { buffer: Buffer; filename: string }[],
): Promise<{ photos: PhotoMetadata[]; exportDir: string }> {
  const exportDir = await fs.mkdtemp(path.join(os.tmpdir(), "photos-on-trails-manual-"));
  const photos: PhotoMetadata[] = [];

  for (const file of files) {
    const metadata = await extractMetadata(file.buffer, file.filename);
    const dest = path.join(exportDir, file.filename);
    await fs.writeFile(dest, file.buffer);
    photos.push(metadata);
  }

  return { photos, exportDir };
}

export interface ExportOptions {
  outputDir?: string;
}

export async function exportActivity(
  state: PipelineState,
  options: ExportOptions = {},
): Promise<{ outputDir: string; zipPath?: string }> {
  const outputDir = options.outputDir ?? path.join(os.tmpdir(), `photos-on-trails-export-${Date.now()}`);

  const result = await exportStatic({
    activity: state.activity,
    photoSourceDir: state.photoSourceDir,
    outputDir,
  });

  return { outputDir: result.outputDir };
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: "EMPTY_GPX" | "EXPORT_FAILED",
  ) {
    super(message);
    this.name = "PipelineError";
  }
}
