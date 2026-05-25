import { createClient } from "@libsql/client";
import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { env } from "./config";

export const db = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function runMigrations() {
  const files = (await readdir(migrationsDir))
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    const stmts = sql
      .split(";")
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s + ";");
    await db.batch(stmts, "write");
  }

  console.log(`[db] migrations applied: ${files.join(", ")}`);
}
