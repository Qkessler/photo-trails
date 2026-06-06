import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resizeImage } from "./image-resizer";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let tmpDir: string;

function fixture(name: string) {
  return path.join(tmpDir, name);
}

async function createTestImage(
  filename: string,
  width: number,
  height: number,
  format: "jpeg" | "png" = "jpeg",
) {
  const filePath = fixture(filename);
  const builder = sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 64, b: 200 } },
  });
  if (format === "png") {
    await builder.png().toFile(filePath);
  } else {
    await builder.jpeg().toFile(filePath);
  }
  return filePath;
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-resizer-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("resizeImage", () => {
  it("resizes a landscape photo to thumbnail and display", async () => {
    const src = await createTestImage("landscape.jpg", 4000, 3000);
    const result = await resizeImage(src, { outputDir: tmpDir });

    const thumbMeta = await sharp(result.thumbnailPath).metadata();
    expect(thumbMeta.width).toBe(200);
    expect(thumbMeta.format).toBe("jpeg");

    const displayMeta = await sharp(result.displayPath).metadata();
    expect(displayMeta.width).toBe(1600);
    expect(displayMeta.format).toBe("jpeg");
  });

  it("resizes a portrait photo preserving aspect ratio", async () => {
    const src = await createTestImage("portrait.jpg", 2000, 4000);
    const result = await resizeImage(src, { outputDir: tmpDir });

    const thumbMeta = await sharp(result.thumbnailPath).metadata();
    expect(thumbMeta.width).toBe(200);
    expect(thumbMeta.height).toBe(400);

    const displayMeta = await sharp(result.displayPath).metadata();
    expect(displayMeta.width).toBe(1600);
    expect(displayMeta.height).toBe(3200);
  });

  it("does not upscale an already-small photo", async () => {
    const src = await createTestImage("tiny.jpg", 150, 100);
    const result = await resizeImage(src, { outputDir: tmpDir });

    const thumbMeta = await sharp(result.thumbnailPath).metadata();
    expect(thumbMeta.width).toBe(150);

    const displayMeta = await sharp(result.displayPath).metadata();
    expect(displayMeta.width).toBe(150);
  });

  it("handles PNG input and outputs JPEG", async () => {
    const src = await createTestImage("input.png", 3000, 2000, "png");
    const result = await resizeImage(src, { outputDir: tmpDir });

    const thumbMeta = await sharp(result.thumbnailPath).metadata();
    expect(thumbMeta.format).toBe("jpeg");
    expect(thumbMeta.width).toBe(200);

    const displayMeta = await sharp(result.displayPath).metadata();
    expect(displayMeta.format).toBe("jpeg");
    expect(displayMeta.width).toBe(1600);
  });

  it("respects custom width options", async () => {
    const src = await createTestImage("custom.jpg", 4000, 3000);
    const result = await resizeImage(src, {
      outputDir: tmpDir,
      thumbnailWidth: 100,
      displayWidth: 800,
    });

    const thumbMeta = await sharp(result.thumbnailPath).metadata();
    expect(thumbMeta.width).toBe(100);

    const displayMeta = await sharp(result.displayPath).metadata();
    expect(displayMeta.width).toBe(800);
  });

  it("generates expected file names", async () => {
    const src = await createTestImage("naming-test.jpg", 1000, 800);
    const result = await resizeImage(src, { outputDir: tmpDir });

    expect(path.basename(result.thumbnailPath)).toBe("naming-test_thumb.jpg");
    expect(path.basename(result.displayPath)).toBe("naming-test_display.jpg");
  });
});
