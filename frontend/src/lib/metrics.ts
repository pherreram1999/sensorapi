import type { Reading } from "../api";

export interface Metric {
  key: keyof Reading;
  label: string;
  short: string;
  unit: string;
  color: { dark: string; light: string };
  accessor: (d: Reading) => number | null;
  isFault: (d: Reading) => boolean;
  desc: string;
}

export const METRICS: Metric[] = [
  {
    key: "temperatura",
    label: "Temperatura",
    short: "Temp.",
    unit: "°C",
    color: { dark: "#f1a26b", light: "#b85518" },
    accessor: (d) => d.temperatura,
    isFault: (d) => d.dht_error === true,
    desc: "Ambiente · DHT",
  },
  {
    key: "humedad",
    label: "Humedad",
    short: "Hum.",
    unit: "%",
    color: { dark: "#7fb0c8", light: "#3e6a86" },
    accessor: (d) => d.humedad,
    isFault: (d) => d.dht_error === true,
    desc: "Relativa · DHT",
  },
  {
    key: "mq7_co",
    label: "CO",
    short: "CO",
    unit: "",
    color: { dark: "#d4a040", light: "#a87617" },
    accessor: (d) => d.mq7_co,
    isFault: () => false,
    desc: "Monóxido · MQ-7",
  },
  {
    key: "mq2_gas",
    label: "Gas Combustible",
    short: "Gas",
    unit: "",
    color: { dark: "#c47080", light: "#8c3838" },
    accessor: (d) => d.mq2_gas,
    isFault: () => false,
    desc: "GLP/Humo · MQ-2",
  },
];

/* ─── Nibbit mood ──────────────────────────────────────────────────────────
   Picks which mascot illustration represents the current state of a metric.
   - waiting: no data, sensor fault, or non-finite value
   - sad: temperatura/humedad readings suggesting rainy conditions
          (humedad > 75% or low temp + elevated humedad)
   - happy: temperatura/humedad in a comfortable range
   - tech: MQ-7 / MQ-2 readings (technical/chemical sensors) */
export type NibbitMood = "happy" | "sad" | "tech" | "waiting";

export const NIBBIT_IMG: Record<NibbitMood, string> = {
  happy:   "/Nibbit_Happy.webp",
  sad:     "/Nibbit_Sad.webp",
  tech:    "/Nibbit_Tecnologias.webp",
  waiting: "/Nibbit_Waiting.webp",
};

export const NIBBIT_LABEL: Record<NibbitMood, string> = {
  happy:   "Condiciones agradables",
  sad:     "Posible día lluvioso",
  tech:    "Sensor químico activo",
  waiting: "Esperando dato válido",
};

export function moodFor(metric: Metric, data: Reading[]): NibbitMood {
  if (!data.length) return "waiting";
  const last = data[data.length - 1];
  const v = metric.accessor(last);
  if (metric.isFault(last) || v === null || !Number.isFinite(v)) return "waiting";

  if (metric.key === "temperatura" || metric.key === "humedad") {
    const t = last.temperatura;
    const h = last.humedad;
    const rainy =
      (h !== null && h > 75) ||
      (t !== null && t < 18 && h !== null && h > 60);
    return rainy ? "sad" : "happy";
  }
  return "tech";
}

export function statsForRaw(
  data: Reading[],
  metric: Metric
): { current: number | null; min: number | null; max: number | null; avg: number | null } {
  const acc = metric.accessor;
  const vals = data.filter((d) => !metric.isFault(d)).map(acc).filter((v): v is number => v !== null && Number.isFinite(v));
  const current = data.length ? acc(data[data.length - 1]) : null;
  if (vals.length === 0) return { current, min: null, max: null, avg: null };
  return {
    current,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  };
}

export function trendOf(data: Reading[], metric: Metric): number {
  const vs = data
    .filter((d) => !metric.isFault(d))
    .map(metric.accessor)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  if (vs.length < 2) return 0;
  return vs[vs.length - 1] - vs[0];
}

export function fmtNumber(n: number | null | undefined, unit?: string): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1000) s = n.toFixed(0);
  else if (abs >= 100) s = n.toFixed(1);
  else if (abs >= 10) s = n.toFixed(1);
  else if (abs >= 1) s = n.toFixed(2);
  else s = n.toFixed(3);
  return unit ? `${s}${unit}` : s;
}

export function fmtTime(ts: number, span: number): string {
  const d = new Date(ts);
  if (span <= 36 * 3600 * 1000) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export function niceTicks(
  min: number,
  max: number,
  count = 4
): { ticks: number[]; start: number; end: number; step: number } {
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  const step0 = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + 1e-9; v += step) ticks.push(+v.toFixed(8));
  return { ticks, start, end, step };
}

export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}
