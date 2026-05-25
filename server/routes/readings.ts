import { db } from "../db";

interface ReadingBody {
  temperatura: number | null;
  humedad: number | null;
  mq7_co: number | null;
  mq2_gas: number | null;
  dht_error: boolean;
}

function isNumericOrNull(v: unknown): v is number | null {
  return v === null || (typeof v === "number" && isFinite(v));
}

export async function insertReading(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    !isNumericOrNull(b.temperatura) ||
    !isNumericOrNull(b.humedad) ||
    !isNumericOrNull(b.mq7_co) ||
    !isNumericOrNull(b.mq2_gas) ||
    typeof b.dht_error !== "boolean"
  ) {
    return Response.json(
      {
        error:
          "body must contain: temperatura, humedad, mq7_co, mq2_gas (number|null) and dht_error (boolean)",
      },
      { status: 400 }
    );
  }

  const payload = b as ReadingBody;
  const created_at = Date.now();

  const result = await db.execute({
    sql: `INSERT INTO readings (temperatura, humedad, mq7_co, mq2_gas, dht_error, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      payload.temperatura,
      payload.humedad,
      payload.mq7_co,
      payload.mq2_gas,
      payload.dht_error ? 1 : 0,
      created_at,
    ],
  });

  return Response.json(
    { id: Number(result.lastInsertRowid), created_at },
    { status: 201 }
  );
}

export async function listReadings(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const now = Date.now();
  const to = parseInt(url.searchParams.get("to") ?? String(now), 10);
  const from = parseInt(url.searchParams.get("from") ?? String(to - 3_600_000), 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5000", 10), 5000);

  const result = await db.execute({
    sql: `SELECT id, temperatura, humedad, mq7_co, mq2_gas, dht_error, created_at
          FROM readings
          WHERE created_at BETWEEN ? AND ?
          ORDER BY created_at ASC
          LIMIT ?`,
    args: [from, to, limit],
  });

  const rows = result.rows.map(row => ({
    id: Number(row.id),
    temperatura: row.temperatura,
    humedad: row.humedad,
    mq7_co: row.mq7_co,
    mq2_gas: row.mq2_gas,
    dht_error: row.dht_error === 1,
    created_at: Number(row.created_at),
  }));

  return Response.json({ rows, count: rows.length });
}
