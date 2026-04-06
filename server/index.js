import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

const SOURCE_API = "http://45.126.43.35:5000/api/data";
const PORT = 8000;

const app = new Hono();

app.use("/api/*", cors());

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/api/data", async (c) => {
  try {
    const response = await fetch(SOURCE_API);

    if (!response.ok) {
      return c.json(
        {
          message: "Gagal mengambil data dari upstream API",
          status: response.status
        },
        502
      );
    }

    const payload = await response.json();
    return c.json(payload);
  } catch (error) {
    return c.json(
      {
        message: "Server proxy gagal menghubungi upstream API",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});

serve({
  fetch: app.fetch,
  port: PORT
}, () => {
  console.log(`Hono API running on http://localhost:${PORT}`);
});
