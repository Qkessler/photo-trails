import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname);

interface TestPhoto {
  filename: string;
  lat: number;
  lng: number;
  timestamp: string;
  color: { r: number; g: number; b: number };
}

const photos: TestPhoto[] = [
  { filename: "photo-start.jpg", lat: 37.7750, lng: -122.4180, timestamp: "2026:01:15 10:01:30", color: { r: 34, g: 139, b: 34 } },
  { filename: "photo-midway.jpg", lat: 37.7760, lng: -122.4120, timestamp: "2026:01:15 10:05:15", color: { r: 70, g: 130, b: 180 } },
  { filename: "photo-end.jpg", lat: 37.7778, lng: -122.4015, timestamp: "2026:01:15 10:13:30", color: { r: 220, g: 120, b: 60 } },
];

function decimalToDms(decimal: number): [number, number, number] {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = ((abs - deg) * 60 - min) * 60;
  return [deg, min, sec];
}

function buildExifBuffer(photo: TestPhoto): Buffer {
  const ifd0: Map<number, { type: number; value: Buffer }> = new Map();
  const exifIfd: Map<number, { type: number; value: Buffer }> = new Map();
  const gpsIfd: Map<number, { type: number; value: Buffer }> = new Map();

  // DateTimeOriginal (0x9003) in EXIF IFD
  const dateStr = photo.timestamp + "\0";
  const dateBytes = Buffer.from(dateStr, "ascii");

  // GPS data
  const [latD, latM, latS] = decimalToDms(photo.lat);
  const [lngD, lngM, lngS] = decimalToDms(Math.abs(photo.lng));

  // Build GPS IFD entries
  const latRef = photo.lat >= 0 ? "N" : "S";
  const lngRef = photo.lng >= 0 ? "E" : "W";

  // We'll use a simpler approach: just create with withExifMerge
  return dateBytes; // placeholder - we'll use sharp's API
}

async function generate() {
  for (const photo of photos) {
    const [latD, latM, latS] = decimalToDms(photo.lat);
    const [lngD, lngM, lngS] = decimalToDms(Math.abs(photo.lng));

    const latRef = photo.lat >= 0 ? "N" : "S";
    const lngRef = photo.lng >= 0 ? "E" : "W";

    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: photo.color,
      },
    })
      .withExifMerge({
        IFD0: {
          DateTime: photo.timestamp,
        },
        IFD2: {
          DateTimeOriginal: photo.timestamp,
        },
        IFD3: {
          GPSLatitudeRef: latRef,
          GPSLatitude: `${latD}/1 ${latM}/1 ${Math.round(latS * 100)}/100`,
          GPSLongitudeRef: lngRef,
          GPSLongitude: `${lngD}/1 ${lngM}/1 ${Math.round(lngS * 100)}/100`,
        },
      })
      .jpeg({ quality: 80 })
      .toFile(path.join(FIXTURES_DIR, photo.filename));

    console.log(`Generated: ${photo.filename} (${photo.timestamp}, ${photo.lat}, ${photo.lng})`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
