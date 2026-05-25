import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "./config";
import { runMigrations } from "./db";
import { withApiKey } from "./auth";
import { insertReading, listReadings } from "./routes/readings";
import { health } from "./routes/health";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "../frontend/dist");

function serveFile(path: string, fallbackMime?: string): Response {
  const file = Bun.file(path);
  return new Response(file);
}

function serveIndex(): Response {
  return serveFile(join(distDir, "index.html"));
}

function serveSpaAsset(req: Request): Response {
  const url = new URL(req.url);
  const filePath = join(distDir, url.pathname);
  const file = Bun.file(filePath);
  return new Response(file);
}

await runMigrations();

const server = Bun.serve({
  port: env.PORT,
  hostname: env.HOST,

  routes: {
    "/api/health": { GET: health },

    "/api/readings": {
      GET: listReadings,
      POST: withApiKey(insertReading),
    },

    "/": {
      GET: () => serveIndex(),
    },

    "/assets/*": {
      GET: serveSpaAsset,
    },
  },

  fetch(req) {
    // SPA history-mode fallback
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) {
      return serveIndex();
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
});

console.log(`[server] listening on http://${env.HOST}:${env.PORT}`);
