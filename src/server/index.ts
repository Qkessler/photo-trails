import express, { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { photosManualRouter } from "./photos-manual.js";
import { importGPX, exportActivity, PipelineError, PipelineState } from "./pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(photosManualRouter);

let currentState: PipelineState | null = null;

app.post("/api/import-gpx", upload.fields([
  { name: "gpx", maxCount: 1 },
  { name: "photos", maxCount: 100 },
]), async (req: Request, res: Response) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const gpxFile = files?.gpx?.[0];

    if (!gpxFile) {
      res.status(400).json({ error: "No GPX file provided. Upload a file under the 'gpx' field." });
      return;
    }

    const gpxString = gpxFile.buffer.toString("utf-8");
    const photoFiles = files?.photos?.map((f) => ({ buffer: f.buffer, filename: f.originalname }));

    const result = await importGPX(gpxString, photoFiles);
    currentState = result.state;

    res.json({
      photoSource: result.photoSource,
      warnings: result.warnings,
      activity: result.state.activity,
    });
  } catch (err) {
    if (err instanceof PipelineError) {
      res.status(422).json({ error: err.message, code: err.code });
      return;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

app.get("/api/photos", (_req: Request, res: Response) => {
  if (!currentState) {
    res.status(404).json({ error: "No activity loaded. Import a GPX file first." });
    return;
  }

  res.json({
    photos: currentState.photos,
    placed: currentState.activity.clusters.flatMap((c) => c.photos),
    unplaced: currentState.activity.unplaced,
  });
});

app.post("/api/export", async (req: Request, res: Response) => {
  if (!currentState) {
    res.status(404).json({ error: "No activity loaded. Import a GPX file first." });
    return;
  }

  try {
    const { outputDir } = await exportActivity(currentState, { outputDir: req.body?.outputDir });
    res.json({ outputDir });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    res.status(500).json({ error: message });
  }
});

app.use(express.static(PROJECT_ROOT));

app.listen(PORT, () => {
  console.log(`[photos-on-trails] Dev server running at http://localhost:${PORT}`);
});

export { app };
