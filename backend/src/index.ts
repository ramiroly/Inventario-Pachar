import { app } from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`[backend] escuchando en http://localhost:${port}`);
});
