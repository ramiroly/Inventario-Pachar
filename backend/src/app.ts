import "dotenv/config";
import cors from "cors";
import express from "express";
import { lineasRouter } from "./routes/lineas.routes.js";
import { productosRouter } from "./routes/productos.routes.js";
import { movimientosRouter } from "./routes/movimientos.routes.js";
import { tanquesRouter } from "./routes/tanques.routes.js";
import { snapshotsRouter } from "./routes/snapshots.routes.js";
import { dashboardsRouter } from "./routes/dashboards.routes.js";

export const app = express();

const origenes = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({ origin: origenes }));
app.use(express.json());

app.get("/", (_req, res) => res.json({ servicio: "Inventario Pachar API", ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/lineas", lineasRouter);
app.use("/productos", productosRouter);
app.use("/movimientos", movimientosRouter);
app.use("/tanques", tanquesRouter);
app.use("/snapshots", snapshotsRouter);
app.use("/dashboards", dashboardsRouter);
