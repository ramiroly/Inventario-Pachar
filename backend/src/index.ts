import "dotenv/config";
import cors from "cors";
import express from "express";
import { lineasRouter } from "./routes/lineas.routes.js";
import { productosRouter } from "./routes/productos.routes.js";
import { movimientosRouter } from "./routes/movimientos.routes.js";
import { tanquesRouter } from "./routes/tanques.routes.js";
import { snapshotsRouter } from "./routes/snapshots.routes.js";
import { dashboardsRouter } from "./routes/dashboards.routes.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/lineas", lineasRouter);
app.use("/productos", productosRouter);
app.use("/movimientos", movimientosRouter);
app.use("/tanques", tanquesRouter);
app.use("/snapshots", snapshotsRouter);
app.use("/dashboards", dashboardsRouter);

app.listen(port, () => {
  console.log(`[backend] escuchando en http://localhost:${port}`);
});
