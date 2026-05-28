import { useRef, useLayoutEffect, useState, useMemo } from "react";
import { niceTicks, smoothPath, fmtNumber, fmtTime } from "../lib/metrics";
import type { Reading } from "../api";

interface Props {
  data: Reading[];
  accessor: (d: Reading) => number | null;
  color: string;
  unit?: string;
  label: string;
  height?: number;
  faultAccessor?: ((d: Reading) => boolean) | null;
}

export default function TimeChart({ data, accessor, color, unit, label, height = 220, faultAccessor }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.round(e.contentRect.width));
    });
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const padL = 44, padR = 14, padT = 14, padB = 26;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const valid = useMemo(
    () => data.map((d, i) => ({ d, i, v: accessor(d) })).filter((p): p is { d: Reading; i: number; v: number } => p.v !== null && Number.isFinite(p.v!)),
    [data, accessor]
  );

  const { ticks, start: yMin, end: yMax } = useMemo(() => {
    const vals = valid.map((p) => p.v);
    if (vals.length === 0) return { ticks: [0, 1], start: 0, end: 1, step: 1 };
    return niceTicks(Math.min(...vals), Math.max(...vals), 4);
  }, [valid]);

  const tMin = data.length ? data[0].created_at : 0;
  const tMax = data.length ? data[data.length - 1].created_at : 1;
  const tSpan = Math.max(1, tMax - tMin);

  const xFn = (ts: number) => padL + ((ts - tMin) / tSpan) * innerW;
  const yFn = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const pts = valid.map((p) => ({ x: xFn(p.d.created_at), y: yFn(p.v), v: p.v, ts: p.d.created_at, i: p.i }));
  const line = smoothPath(pts);
  const areaD = pts.length >= 2
    ? `${line} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`
    : "";

  const xTicks = useMemo(() => {
    if (!data.length) return [];
    const count = Math.max(3, Math.min(6, Math.floor(innerW / 90)));
    return Array.from({ length: count }, (_, i) => tMin + (i / (count - 1)) * tSpan);
  }, [tMin, tSpan, innerW, data.length]);

  const faultBands = useMemo(() => {
    if (!faultAccessor || !data.length) return [] as [number, number][];
    const bands: [number, number][] = [];
    let curStart: number | null = null;
    for (let i = 0; i < data.length; i++) {
      const fault = faultAccessor(data[i]);
      if (fault && curStart === null) curStart = data[i].created_at;
      if ((!fault || i === data.length - 1) && curStart !== null) {
        const end = fault ? data[i].created_at : (data[i - 1]?.created_at ?? curStart);
        bands.push([curStart, end]);
        curStart = null;
      }
    }
    return bands;
  }, [data, faultAccessor]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pts.length || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0, bestDx = Infinity;
    for (const p of pts) {
      const dx = Math.abs(p.x - mx);
      if (dx < bestDx) { best = p.i; bestDx = dx; }
    }
    setHover(best);
  };

  const hoverPt = hover !== null ? pts.find((p) => p.i === hover) : null;
  const gradId = `tg-${label}`;

  return (
    <div ref={ref} className="tchart" style={{ height }}
         onMouseMove={onMouseMove} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {faultBands.map(([s, e], i) => (
            <rect key={i} x={xFn(s)} y={padT} width={Math.max(2, xFn(e) - xFn(s))} height={innerH}
                  fill="var(--fault-band)" />
          ))}

          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={yFn(t)} y2={yFn(t)} stroke="var(--grid)" strokeWidth={1} />
              <text x={padL - 8} y={yFn(t)} textAnchor="end" dominantBaseline="middle"
                    className="axis-label">{fmtNumber(t)}</text>
            </g>
          ))}

          {xTicks.map((t, i) => (
            <text key={i} x={xFn(t)} y={height - 8}
                  textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
                  className="axis-label">{fmtTime(t, tSpan)}</text>
          ))}

          <path d={areaD} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={1.75}
                strokeLinecap="round" strokeLinejoin="round" />

          {hoverPt && (
            <g>
              <line x1={hoverPt.x} x2={hoverPt.x} y1={padT} y2={padT + innerH}
                    stroke="var(--fg-dim)" strokeDasharray="2 3" strokeWidth={1} />
              <circle cx={hoverPt.x} cy={hoverPt.y} r={4} fill="var(--bg)" stroke={color} strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hoverPt && (
        <div className="tooltip" style={{
          left: Math.min(w - 150, Math.max(0, hoverPt.x - 70)),
          top: Math.max(0, hoverPt.y - 56),
        }}>
          <div className="tt-v" style={{ color }}>{fmtNumber(hoverPt.v, unit)}</div>
          <div className="tt-t">{fmtTime(hoverPt.ts, tSpan)}</div>
        </div>
      )}
    </div>
  );
}
