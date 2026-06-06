import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ActivityData, PhotoCluster } from "@core/types";
import { resizeImage } from "./image-resizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export interface ExportInput {
  activity: ActivityData;
  photoSourceDir: string;
  outputDir: string;
}

export interface ExportResult {
  outputDir: string;
  photoCount: number;
  activityJsonPath: string;
}

export async function exportStatic(input: ExportInput): Promise<ExportResult> {
  const { activity, photoSourceDir, outputDir } = input;

  await fs.mkdir(outputDir, { recursive: true });

  const photosDir = path.join(outputDir, "photos");
  await fs.mkdir(photosDir, { recursive: true });

  await buildViewer(outputDir);

  const photoCount = await processPhotos(activity.clusters, photoSourceDir, photosDir);

  const exportActivity = buildActivityJson(activity, photosDir);
  const activityJsonPath = path.join(outputDir, "activity.json");
  await fs.writeFile(activityJsonPath, JSON.stringify(exportActivity, null, 2));

  return { outputDir, photoCount, activityJsonPath };
}

async function buildViewer(outputDir: string): Promise<void> {
  const distDir = path.join(PROJECT_ROOT, "dist");

  const distExists = await fs.stat(distDir).catch(() => null);
  if (!distExists) {
    execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "pipe" });
  }

  const viewerHtml = await findViewerHtml(distDir);
  if (!viewerHtml) {
    throw new Error("Viewer build output not found. Expected viewer.html in dist/");
  }

  await copyDir(distDir, outputDir, (filePath) => {
    const rel = path.relative(distDir, filePath);
    return !rel.startsWith("index.html");
  });
}

async function findViewerHtml(distDir: string): Promise<string | null> {
  const candidate = path.join(distDir, "viewer.html");
  const exists = await fs.stat(candidate).catch(() => null);
  return exists ? candidate : null;
}

async function copyDir(
  src: string,
  dest: string,
  filter: (filePath: string) => boolean,
): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath, filter);
    } else if (filter(srcPath)) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function processPhotos(
  clusters: PhotoCluster[],
  sourceDir: string,
  photosDir: string,
): Promise<number> {
  let count = 0;

  for (const cluster of clusters) {
    for (const placed of cluster.photos) {
      const sourcePath = path.join(sourceDir, placed.photo.filename);
      const exists = await fs.stat(sourcePath).catch(() => null);
      if (!exists) continue;

      await resizeImage(sourcePath, { outputDir: photosDir });
      count++;
    }
  }

  return count;
}

export function buildActivityJson(activity: ActivityData, photosDir: string): ActivityData {
  const clusters = activity.clusters.map((cluster) => ({
    ...cluster,
    photos: cluster.photos.map((placed) => {
      const baseName = path.basename(placed.photo.filename, path.extname(placed.photo.filename));
      return {
        ...placed,
        photo: {
          ...placed.photo,
          thumbnailUrl: `photos/${baseName}_thumb.jpg`,
          displayUrl: `photos/${baseName}_display.jpg`,
        },
      };
    }),
  }));

  return {
    segments: activity.segments,
    clusters,
    unplaced: activity.unplaced,
  };
}
