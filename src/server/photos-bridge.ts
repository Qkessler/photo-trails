import { execFile } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { PhotoMetadata } from "../core/types.js";

export interface PhotosBridgeOptions {
  startTime: number; // Unix ms
  endTime: number; // Unix ms
  bufferMinutes?: number;
  exportDir?: string;
}

export interface PhotosBridgeResult {
  photos: PhotoMetadata[];
  exportDir: string;
}

export class PhotosBridgeError extends Error {
  constructor(
    message: string,
    public readonly code: "PERMISSION_DENIED" | "NO_PHOTOS" | "OSASCRIPT_FAILED" | "EXPORT_FAILED",
  ) {
    super(message);
    this.name = "PhotosBridgeError";
  }
}

export function buildJXAScript(startDate: string, endDate: string, exportDir: string): string {
  return `
    ObjC.import('Foundation');
    ObjC.import('AppKit');

    const Photos = Application('Photos');

    try {
      Photos.running();
    } catch (e) {
      JSON.stringify({ error: 'permission_denied', message: 'Cannot access Photos. Grant automation permission in System Settings > Privacy & Security > Automation.' });
    }

    const startDate = new Date('${startDate}');
    const endDate = new Date('${endDate}');
    const exportPath = '${exportDir}';

    const allPhotos = Photos.mediaItems();
    const matches = [];

    for (let i = 0; i < allPhotos.length; i++) {
      const item = allPhotos[i];
      const date = item.date();
      if (!date) continue;
      const ts = date.getTime();
      if (ts >= startDate.getTime() && ts <= endDate.getTime()) {
        const loc = item.location();
        matches.push({
          id: item.id(),
          filename: item.filename(),
          timestamp: ts,
          lat: loc ? loc[0] : null,
          lng: loc ? loc[1] : null,
          width: item.width(),
          height: item.height()
        });
      }
    }

    if (matches.length === 0) {
      JSON.stringify({ error: 'no_photos', message: 'No photos found in the specified time range.' });
    } else {
      const mediaItems = matches.map(m => Photos.mediaItems.byId(m.id));
      Photos.export(mediaItems, { to: Path(exportPath), usingOriginals: true });
      JSON.stringify({ photos: matches });
    }
  `;
}

export function runOsascript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 120_000 }, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr || error.message;
        if (msg.includes("not allowed") || msg.includes("permission") || msg.includes("-1743")) {
          reject(new PhotosBridgeError(
            "Photos access denied. Grant automation permission in System Settings > Privacy & Security > Automation.",
            "PERMISSION_DENIED",
          ));
        } else {
          reject(new PhotosBridgeError(`osascript execution failed: ${msg}`, "OSASCRIPT_FAILED"));
        }
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export type OsascriptRunner = (script: string) => Promise<string>;

export async function queryPhotos(
  options: PhotosBridgeOptions,
  executor: OsascriptRunner = runOsascript,
): Promise<PhotosBridgeResult> {
  const buffer = (options.bufferMinutes ?? 10) * 60 * 1000;
  const start = new Date(options.startTime - buffer);
  const end = new Date(options.endTime + buffer);

  const exportDir = options.exportDir ?? await mkdtemp(path.join(os.tmpdir(), "photos-on-trails-"));
  await mkdir(exportDir, { recursive: true });

  const script = buildJXAScript(start.toISOString(), end.toISOString(), exportDir);

  let output: string;
  try {
    output = await executor(script);
  } catch (err) {
    if (err instanceof PhotosBridgeError) throw err;
    throw new PhotosBridgeError(`Unexpected osascript error: ${err}`, "OSASCRIPT_FAILED");
  }

  let parsed: { photos?: Array<Record<string, unknown>>; error?: string; message?: string };
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new PhotosBridgeError(`Failed to parse JXA output: ${output}`, "OSASCRIPT_FAILED");
  }

  if (parsed.error === "permission_denied") {
    throw new PhotosBridgeError(parsed.message ?? "Permission denied", "PERMISSION_DENIED");
  }
  if (parsed.error === "no_photos") {
    throw new PhotosBridgeError(parsed.message ?? "No photos found in time range", "NO_PHOTOS");
  }

  if (!parsed.photos || parsed.photos.length === 0) {
    throw new PhotosBridgeError("No photos found in the specified time range.", "NO_PHOTOS");
  }

  const photos: PhotoMetadata[] = parsed.photos.map((p) => ({
    id: String(p.id),
    filename: String(p.filename),
    timestamp: typeof p.timestamp === "number" ? p.timestamp : null,
    lat: typeof p.lat === "number" ? p.lat : null,
    lng: typeof p.lng === "number" ? p.lng : null,
    width: typeof p.width === "number" ? p.width : undefined,
    height: typeof p.height === "number" ? p.height : undefined,
  }));

  return { photos, exportDir };
}
