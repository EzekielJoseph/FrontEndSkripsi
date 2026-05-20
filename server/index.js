import { Hono } from "hono";
import { serve } from "@hono/node-server";

const SOURCE_API = process.env.SOURCE_API;
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!SOURCE_API) {
  throw new Error("Missing SOURCE_API environment variable");
}

const app = new Hono();

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/api/data", async (c) => {
  try {
    const upstreamUrl = new URL(SOURCE_API);
    const deviceId = c.req.query("device_id");
    const limit = c.req.query("limit") ?? c.req.query("jumlah");

    if (deviceId) {
      upstreamUrl.searchParams.set("device_id", deviceId);
    }
    if (limit) {
      upstreamUrl.searchParams.set("limit", limit);
    }

    const response = await fetch(upstreamUrl);

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

serve(
  {
    fetch: app.fetch,
    port: PORT
  },
  () => {
    console.log(`Legacy Hono proxy running on http://127.0.0.1:${PORT}`);
  }
);
