#!/usr/bin/env bun
/* Inyecta lecturas simuladas en el endpoint POST /api/readings.
 *
 * Uso:
 *   bun run seed --scenario normal --count 60 --rate-ms 1000
 *   bun run seed --scenario rainy  --live --rate-ms 3000
 *   bun run seed --scenario mixed  --live
 *
 * Variables de entorno:
 *   API_SECRET_KEY   (requerida)  — la misma usada por el servidor
 *   SEED_API_URL                  — base del servidor (default http://localhost:8080)
 */

type Scenario = "normal" | "rainy" | "leak" | "co" | "faults" | "mixed";

interface Opts {
  url: string;
  apiKey: string;
  scenario: Scenario;
  count: number;
  rateMs: number;
  live: boolean;
  faultRate: number;
}

interface Reading {
  temperatura: number | null;
  humedad: number | null;
  mq7_co: number | null;
  mq2_gas: number | null;
  dht_error: boolean;
}

/* ─── CLI ──────────────────────────────────────────────────────────────── */

function parseArgs(argv: string[]): Opts {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const flag = (name: string): boolean => argv.includes(`--${name}`);

  if (flag("help") || flag("h")) {
    printHelp();
    process.exit(0);
  }

  const scenario = (get("scenario") ?? "normal") as Scenario;
  if (!["normal", "rainy", "leak", "co", "faults", "mixed"].includes(scenario)) {
    console.error(`scenario inválido: ${scenario}`);
    process.exit(1);
  }

  const apiKey = process.env.API_SECRET_KEY;
  if (!apiKey) {
    console.error("Falta API_SECRET_KEY en el entorno.");
    process.exit(1);
  }

  return {
    url: (process.env.SEED_API_URL ?? "http://localhost:8080").replace(/\/+$/, ""),
    apiKey,
    scenario,
    count: parseInt(get("count") ?? "60", 10),
    rateMs: parseInt(get("rate-ms") ?? "1000", 10),
    live: flag("live"),
    faultRate: parseFloat(get("fault-rate") ?? "0"),
  };
}

function printHelp(): void {
  console.log(`Inyector de datos simulados

  --scenario <n>     normal | rainy | leak | co | faults | mixed (default: normal)
  --count <n>        número de lecturas a enviar (default: 60, ignorado con --live)
  --rate-ms <n>      ms entre envíos (default: 1000)
  --live             envía indefinidamente hasta Ctrl+C
  --fault-rate <0-1> probabilidad extra de dht_error (default: 0)
  --help             muestra esta ayuda

Variables: API_SECRET_KEY (requerida), SEED_API_URL (default http://localhost:8080)
`);
}

/* ─── Generador (random walk con estado por escenario) ─────────────────── */

interface State {
  temp: number;
  hum: number;
  co: number;
  gas: number;
}

function initialState(scenario: Scenario): State {
  switch (scenario) {
    case "rainy":  return { temp: 16, hum: 82, co: 110, gas: 140 };
    case "leak":   return { temp: 23, hum: 55, co: 130, gas: 380 };
    case "co":     return { temp: 24, hum: 50, co: 420, gas: 160 };
    case "faults": return { temp: 22, hum: 55, co: 120, gas: 150 };
    default:       return { temp: 22, hum: 50, co: 120, gas: 150 };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function walk(v: number, step: number, lo: number, hi: number): number {
  const next = v + (Math.random() - 0.5) * 2 * step;
  return clamp(next, lo, hi);
}

function round(n: number, digits = 2): number {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function step(state: State, scenario: Scenario, opts: Opts): Reading {
  // Cada escenario empuja a su atractor preferido (mean reversion suave).
  const target = initialState(scenario);
  const pull = 0.03;
  state.temp += (target.temp - state.temp) * pull;
  state.hum  += (target.hum  - state.hum)  * pull;
  state.co   += (target.co   - state.co)   * pull;
  state.gas  += (target.gas  - state.gas)  * pull;

  // Walk
  state.temp = walk(state.temp, 0.35, -10, 50);
  state.hum  = walk(state.hum,  1.2,    0, 100);
  state.co   = walk(state.co,   15,    50, 900);
  state.gas  = walk(state.gas,  20,    50, 900);

  // Mixed: cada ~60 pasos cambia de modo (afecta los targets para próximos steps).
  // (gestionado por el caller; aquí solo emitimos el dato actual)

  const dhtError = Math.random() < opts.faultRate || (scenario === "faults" && Math.random() < 0.15);

  return {
    temperatura: dhtError ? null : round(state.temp, 2),
    humedad:     dhtError ? null : round(state.hum, 1),
    mq7_co:      round(state.co, 0),
    mq2_gas:     round(state.gas, 0),
    dht_error:   dhtError,
  };
}

/* ─── HTTP ─────────────────────────────────────────────────────────────── */

async function post(opts: Opts, body: Reading): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(`${opts.url}/api/readings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": opts.apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function fmt(b: Reading): string {
  if (b.dht_error) return `dht_error · CO=${b.mq7_co} · GAS=${b.mq2_gas}`;
  return `T=${b.temperatura}°C · H=${b.humedad}% · CO=${b.mq7_co} · GAS=${b.mq2_gas}`;
}

/* ─── Bucle principal ──────────────────────────────────────────────────── */

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const state = initialState(opts.scenario);
  let scenario: Scenario = opts.scenario;
  const rotation: Scenario[] = ["normal", "rainy", "leak", "co", "faults"];

  const target = opts.live ? Infinity : opts.count;
  console.log(
    `[seed] → ${opts.url}/api/readings  scenario=${opts.scenario}  ` +
    `${opts.live ? "live" : `count=${opts.count}`}  rate=${opts.rateMs}ms`
  );

  let stop = false;
  process.on("SIGINT", () => {
    if (stop) process.exit(130);
    console.log("\n[seed] deteniendo… (Ctrl+C otra vez para forzar)");
    stop = true;
  });

  let sent = 0;
  let failed = 0;
  let nextTick = Date.now();

  while (!stop && sent < target) {
    if (opts.scenario === "mixed" && sent > 0 && sent % 60 === 0) {
      scenario = rotation[(sent / 60) % rotation.length] as Scenario;
      console.log(`[seed] · cambio de modo → ${scenario}`);
    }

    const body = step(state, scenario, opts);
    try {
      const r = await post(opts, body);
      if (r.ok) {
        sent++;
        if (sent % 10 === 0 || sent <= 3) {
          console.log(`[seed] ${sent.toString().padStart(4)} · ${fmt(body)}`);
        }
      } else {
        failed++;
        console.error(`[seed] HTTP ${r.status}: ${r.text}`);
        if (r.status === 401) {
          console.error("[seed] API_SECRET_KEY no coincide. Abortando.");
          break;
        }
      }
    } catch (err) {
      failed++;
      console.error(`[seed] fallo de red: ${(err as Error).message}`);
    }

    nextTick += opts.rateMs;
    const sleep = nextTick - Date.now();
    if (sleep > 0) await Bun.sleep(sleep);
    else nextTick = Date.now();
  }

  console.log(`[seed] listo · enviadas=${sent} fallidas=${failed}`);
}

await main();
