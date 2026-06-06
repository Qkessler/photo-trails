import sharp from "sharp";
import path from "node:path";

export async function createTestJpeg(
  outputPath: string,
  width = 3000,
  height = 2000,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 180, b: 80 } },
  })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}

export async function createTestPortrait(outputPath: string): Promise<void> {
  await createTestJpeg(outputPath, 2000, 3000);
}
