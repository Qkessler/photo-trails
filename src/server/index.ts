import express, { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

app.post("/api/import-gpx", (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — depends on GPX parser (T3) and Photos Bridge (T17)" });
});

app.get("/api/photos", (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — depends on Photos Bridge (T17)" });
});

app.post("/api/export", (_req: Request, res: Response) => {
  res.status(501).json({ error: "Not implemented — depends on Static Exporter (T21)" });
});

app.use(express.static(PROJECT_ROOT));

app.listen(PORT, () => {
  console.log(`[photos-on-trails] Dev server running at http://localhost:${PORT}`);
});

export { app };
