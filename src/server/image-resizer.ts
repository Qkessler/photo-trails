import sharp from "sharp";
import path from "node:path";

export interface ResizeResult {
  thumbnailPath: string;
  displayPath: string;
}

export interface ResizeOptions {
  thumbnailWidth?: number;
  displayWidth?: number;
  outputDir: string;
}

const DEFAULT_THUMBNAIL_WIDTH = 200;
const DEFAULT_DISPLAY_WIDTH = 1600;

export async function resizeImage(
  sourcePath: string,
  options: ResizeOptions,
): Promise<ResizeResult> {
  const thumbWidth = options.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
  const displayWidth = options.displayWidth ?? DEFAULT_DISPLAY_WIDTH;

  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  const thumbnailPath = path.join(options.outputDir, `${baseName}_thumb.jpg`);
  const displayPath = path.join(options.outputDir, `${baseName}_display.jpg`);

  const image = sharp(sourcePath);
  const metadata = await image.metadata();

  const originalWidth = metadata.width ?? 0;

  await sharp(sourcePath)
    .resize({
      width: Math.min(thumbWidth, originalWidth),
      withoutEnlargement: true,
    })
    .jpeg({ quality: 75 })
    .toFile(thumbnailPath);

  await sharp(sourcePath)
    .resize({
      width: Math.min(displayWidth, originalWidth),
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toFile(displayPath);

  return { thumbnailPath, displayPath };
}
