import { Router, Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import exifReader from "exif-reader";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import type { PhotoMetadata } from "../core/types.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

function dmsToDecimal(dms: number[], ref: string): number | null {
  if (!dms || dms.length < 3) return null;
  const [degrees, minutes, seconds] = dms;
  const decimal = degrees + minutes / 60 + seconds / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

function parseExifTimestamp(date: Date | string | undefined): number | null {
  if (!date) return null;
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export async function extractMetadata(buffer: Buffer, filename: string): Promise<PhotoMetadata> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  let lat: number | null = null;
  let lng: number | null = null;
  let timestamp: number | null = null;

  if (metadata.exif) {
    try {
      const exif = exifReader(metadata.exif);

      if (exif.GPSInfo) {
        const gps = exif.GPSInfo;
        if (gps.GPSLatitude && gps.GPSLatitudeRef) {
          lat = dmsToDecimal(gps.GPSLatitude, gps.GPSLatitudeRef);
        }
        if (gps.GPSLongitude && gps.GPSLongitudeRef) {
          lng = dmsToDecimal(gps.GPSLongitude, gps.GPSLongitudeRef);
        }
      }

      if (exif.Photo?.DateTimeOriginal) {
        timestamp = parseExifTimestamp(exif.Photo.DateTimeOriginal);
      } else if (exif.Image?.DateTime) {
        timestamp = parseExifTimestamp(exif.Image.DateTime);
      }
    } catch {
      // EXIF parsing failed — proceed with nulls
    }
  }

  return {
    id: crypto.randomUUID(),
    filename,
    timestamp,
    lat,
    lng,
    width: metadata.width,
    height: metadata.height,
  };
}

export async function saveToTemp(buffer: Buffer, filename: string): Promise<string> {
  const dir = path.join(os.tmpdir(), "photos-on-trails-manual");
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${crypto.randomUUID()}-${filename}`);
  await fs.writeFile(dest, buffer);
  return dest;
}

router.post("/api/photos/manual", upload.array("photos", 100), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    res.status(400).json({ error: "No photo files provided" });
    return;
  }

  const results: PhotoMetadata[] = [];
  const errors: { filename: string; error: string }[] = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const metadata = await extractMetadata(file.buffer, file.originalname);
        await saveToTemp(file.buffer, file.originalname);
        results.push(metadata);
      } catch (err) {
        errors.push({
          filename: file.originalname,
          error: err instanceof Error ? err.message : "Unknown error reading file",
        });
      }
    }),
  );

  res.json({ photos: results, errors });
});

export { router as photosManualRouter };
