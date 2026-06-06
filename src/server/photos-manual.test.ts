import { describe, it, expect } from "vitest";
import { extractMetadata } from "./photos-manual.js";
import sharp from "sharp";

async function makeTestImage(opts?: { withGps?: boolean; withDate?: boolean }): Promise<Buffer> {
  let image = sharp({
    create: { width: 100, height: 80, channels: 3, background: { r: 128, g: 128, b: 128 } },
  }).jpeg();

  const exifMerge: Record<string, Record<string, string>> = {};

  if (opts?.withDate) {
    exifMerge["IFD2"] = { DateTimeOriginal: "2024:06:15 10:30:00" };
  }
  if (opts?.withGps) {
    exifMerge["IFD3"] = {
      GPSLatitude: "47/1 36/1 30/1",
      GPSLatitudeRef: "N",
      GPSLongitude: "122/1 19/1 45/1",
      GPSLongitudeRef: "W",
    };
  }

  if (Object.keys(exifMerge).length > 0) {
    image = image.withExifMerge(exifMerge);
  }

  return image.toBuffer();
}

describe("extractMetadata", () => {
  it("returns basic metadata for a plain image without EXIF", async () => {
    const buffer = await sharp({
      create: { width: 200, height: 150, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const result = await extractMetadata(buffer, "plain.jpg");

    expect(result.filename).toBe("plain.jpg");
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.timestamp).toBeNull();
  });

  it("extracts GPS coordinates from EXIF", async () => {
    const buffer = await makeTestImage({ withGps: true });
    const result = await extractMetadata(buffer, "geotagged.jpg");

    expect(result.lat).toBeCloseTo(47.608333, 3);
    expect(result.lng).toBeCloseTo(-122.329167, 3);
  });

  it("extracts timestamp from EXIF DateTimeOriginal", async () => {
    const buffer = await makeTestImage({ withDate: true });
    const result = await extractMetadata(buffer, "dated.jpg");

    expect(result.timestamp).not.toBeNull();
    const date = new Date(result.timestamp!);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(5); // June = 5
    expect(date.getDate()).toBe(15);
  });

  it("handles a PNG without EXIF gracefully", async () => {
    const buffer = await sharp({
      create: { width: 50, height: 50, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const result = await extractMetadata(buffer, "red.png");

    expect(result.filename).toBe("red.png");
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.timestamp).toBeNull();
  });

  it("returns the PhotoMetadata shape contract", async () => {
    const buffer = await makeTestImage({ withGps: true, withDate: true });
    const result = await extractMetadata(buffer, "full.jpg");

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("lat");
    expect(result).toHaveProperty("lng");
  });
});
